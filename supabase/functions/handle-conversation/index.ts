import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { Hono } from "jsr:@hono/hono";
import TwilioMediaStreamSaveAudio from "./TwilioMediaStreamSaveAudio.ts";
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const OPENAI_URL = Deno.env.get("OPENAI_URL");

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

let streamSid: string | null = null;
// Add these new state variables
let lastAssistantItem: string | null = null;
let markQueue: string[] = [];
let responseStartTimestamp: number | null = null;
let latestMediaTimestamp: number = 0;
let fromNumber: string | null = null;
let toNumber: string | null = null;
let callStartTime: number | null = null;
let callEndTime: number | null = null;
let init: boolean = false;
// Constants// Clean protocols and slashes
let saveAudio: TwilioMediaStreamSaveAudio | null = null;

let VOICE = "alloy";

// List of Event Types to log to the console. See the OpenAI Realtime API Documentation.
const LOG_EVENT_TYPES = [
  "error",
  "response.content.done",
  "rate_limits.updated",
  "response.done",
  "input_audio_buffer.committed",
  "input_audio_buffer.speech_stopped",
  "input_audio_buffer.speech_started",
  "session.created",
];

const sendMark = (socket: WebSocket, streamSid: string | null) => {
  if (streamSid) {
    socket.send(JSON.stringify({
      event: "mark",
      streamSid: streamSid,
      mark: { name: "responsePart" },
    }));
    markQueue.push("responsePart");
  }
};
// Handle speech started event
const handleSpeechStartedEvent = (openAiWs: WebSocket, socket: WebSocket) => {
  console.log(
    `[${new Date().toISOString()}] Handling user speech started event.`,
  );
  if (markQueue.length > 0 && responseStartTimestamp != null) {
    const elapsedTime = latestMediaTimestamp - responseStartTimestamp;
    if (lastAssistantItem) {
      const truncateEvent = {
        type: "conversation.item.truncate",
        item_id: lastAssistantItem,
        content_index: 0,
        audio_end_ms: elapsedTime,
      };
      openAiWs.send(JSON.stringify(truncateEvent));
      console.log(
        `[${
          new Date().toISOString()
        }] Truncated LLM response after ${elapsedTime}ms.`,
      );
    }

    socket.send(JSON.stringify({
      event: "clear",
      streamSid: streamSid,
    }));
    console.log(
      `[${
        new Date().toISOString()
      }] Truncated LLM response after ${elapsedTime}ms.`,
    );
    markQueue = [];
    lastAssistantItem = null;
    responseStartTimestamp = null;
  }
};

const saveConversation = async () => {
  console.log("Saving conversation");
    const result = await saveAudio?.twilioStreamStop();
    console.log("Call recording saved successfully");
    const duration = callEndTime && callStartTime
      ? Math.max(0, Math.floor((callEndTime - callStartTime) / 1000))
      : 0;

      const { error: dbError } = await supabase
      .from("calls")
      .insert({
        call_sid: streamSid,
        status: "completed",
        start_time: new Date(callStartTime!),
        end_time: new Date(callEndTime!),
        duration: duration,
        recording_url: result?.error ? null : result?.data?.path,
        is_test_call: init,
        from_number: fromNumber,
        to_number: toNumber,
      });

    if (dbError) {
      console.error("Error saving call metadata:", dbError);
    }
    console.log("Call saved successfully");
};

const app = new Hono().basePath(`/handle-conversation`);

app.get("/", (c) => {
  console.log("URL", c.req.url)
  const upgrade = c.req.header("upgrade") || "";
 
  let SYSTEM_MESSAGE = "";
  

  if (upgrade.toLowerCase() !== "websocket") {
    return new Response("request isn't trying to upgrade to websocket.");
  }
    let goodbyeMessageSent = false;
    let openAiWs: WebSocket;
    // Construct the WebSocket URL with the API key as a query parameter
    const wsUrl = `${OPENAI_URL}&api-key=${OPENAI_API_KEY}`.replace(
      "https://",
      "wss://",
    );

    
    const sendInitialSessionUpdate = () => {
      const sessionUpdate = {
        type: "session.update",
        session: {
          turn_detection: { type: "server_vad" },
          input_audio_format: "g711_ulaw",
          output_audio_format: "g711_ulaw",
          voice: VOICE,
          instructions: SYSTEM_MESSAGE,
          modalities: ["text", "audio"],
          temperature: 0.8,
          max_response_output_tokens: 1000,
        },
      };

      console.log("Sending session update:", JSON.stringify(sessionUpdate));
      openAiWs.send(JSON.stringify(sessionUpdate));

      const initialConversationItem = {
        type: "conversation.item.create",
        item: {
          type: "message",
          role: "user",
          content: [
            {
              type: "input_text",
              text:
                'Greet the user',
            },
          ],
        },
      };

      openAiWs.send(JSON.stringify(initialConversationItem));
      openAiWs.send(JSON.stringify({ type: "response.create" }));
    };

    

  const { socket, response } = Deno.upgradeWebSocket(c.req.raw);
  
    socket.onclose = async() => {
      if (openAiWs.readyState === WebSocket.OPEN) openAiWs.close();
      console.log("Client disconnected.");
      
      await saveConversation();
    };

    

    socket.onmessage = async (event) => {
      try {
        const data = JSON.parse(event.data);
        switch (data.event) {
          case "media":
            latestMediaTimestamp = data.media.timestamp;
            if (openAiWs.readyState === WebSocket.OPEN) {
              const audioAppend = {
                type: "input_audio_buffer.append",
                audio: data.media.payload,
              };

              // Save the user's audio chunk
              saveAudio?.twilioStreamMedia(data.media.payload);

              if (latestMediaTimestamp > 120000 && !goodbyeMessageSent) {
                // Check if 2 minutes have passed and we haven't sent goodbye

                goodbyeMessageSent = true;
                const goodbyeMessage = {
                  type: "conversation.item.create",
                  item: {
                    type: "message",
                    role: "user",
                    content: [
                      {
                        type: "input_text",
                        text:
                          "Try to anwer but also say that you are runing out of time, wrap up the conversation and end it politely. You have 10 seconds left.",
                      },
                    ],
                  },
                };

                openAiWs.send(JSON.stringify(goodbyeMessage));
                openAiWs.send(JSON.stringify({ type: "response.create" }));

                // Close the connection after a short delay to allow the goodbye message
                setTimeout(() => {
                  openAiWs.close();
                  socket.close();
                }, 15000);
              } else {
                openAiWs.send(JSON.stringify(audioAppend));
              }
            }
            break;
          case "start": {
            streamSid = data.start.streamSid;
            responseStartTimestamp = null;
            latestMediaTimestamp = 0;
            init = data.start.customParameters?.init === 'true' || data.start.customParameters?.init === true;
            VOICE = data.start.customParameters?.voice || 'alloy';
            fromNumber = data.start.customParameters?.from;
            toNumber = data.start.customParameters?.to;
            saveAudio = new TwilioMediaStreamSaveAudio({
              supabaseClient: supabase,
              bucketName: 'conversations',
              filePath: `${streamSid}/audio.wav`,
            });
            console.log("INIT", init)

            if (init) {
              console.log("Using init prompt...");
              SYSTEM_MESSAGE = await supabase.from("prompts").select("prompt").eq("id", 2).single().then(res => res.data?.prompt);
            } else {
              const [
                { data: promptData },
                { data: context, error: contextError }
              ] = await Promise.all([
                supabase.from("prompts").select("prompt").eq("id", 3).single(),
                supabase.from("context").select("long_term_context, short_term_context").eq("phone_number", toNumber).single()
              ]);
              SYSTEM_MESSAGE = promptData?.prompt;
              if(contextError){
                console.error("Error getting context:", contextError);
              } else {
                console.log("CONTEXT", context)
                SYSTEM_MESSAGE = SYSTEM_MESSAGE + " \n\n" + "Below is information about the user and highlights from previous conversations. You already met them. Use this context to make the interaction personalized and meaningful. Reference it subtly and naturally, as appropriate, for example by mentioning the user's name or referring to previous conversations." + " \n\n" + "Long Term Context: " + context?.long_term_context + " \n\n" + "Short Term Context: " + context?.short_term_context
              }
            }
            console.log("SYSTEM_MESSAGE", SYSTEM_MESSAGE)
            openAiWs = new WebSocket(
              wsUrl,
              [
                "realtime",
                //`openai-insecure-api-key.${OPENAI_API_KEY}`,
                "openai-beta.realtime-v1",
              ],
            );
            // Open event for OpenAI WebSocket
            openAiWs.onopen = () => {
              console.log("Connected to Azure OpenAI Realtime API");
              setTimeout(sendInitialSessionUpdate, 100);
            };
             
            // Set initial start time from Twilio's timestamp
            callStartTime =  Date.now();
            responseStartTimestamp = callStartTime;
            console.log(
              `[${
                new Date().toISOString()
              }] Incoming stream started with streamSid: ${streamSid}`,
              `from: ${fromNumber}, to: ${toNumber}, isTest: ${init}`,
            );

            openAiWs.onclose = () => {
              console.log("OpenAI WebSocket closed.");
            };
        
            openAiWs.onerror = (error) => {
              console.error("OpenAI WebSocket error:", error);
            };

            openAiWs.onmessage = (event) => {
              try {
                const response = JSON.parse(event.data);
        
                if (LOG_EVENT_TYPES.includes(response.type)) {
                  console.log(
                    `[${new Date().toISOString()}] Received event: ${response.type}`,
                    response,
                  );
                }
        
                if (response.type === "session.updated") {
                  console.log(
                    `[${new Date().toISOString()}] Session updated successfully:`,
                    response,
                  );
                }
        
                if (response.type === "response.audio.delta" && response.delta) {
                  const audioDelta = {
                    event: "media",
                    streamSid: streamSid,
                    media: { payload: response.delta },
                  };
                  socket.send(JSON.stringify(audioDelta));
                  saveAudio?.twilioStreamMedia(response.delta);
                  
        
                  if (!responseStartTimestamp) {
                    responseStartTimestamp = latestMediaTimestamp;
                    console.log(`[${responseStartTimestamp}] LLM started talking.`);
                  }
                  if (response.item_id) {
                    lastAssistantItem = response.item_id;
                  }
                  sendMark(socket, streamSid);
                }
        
                if (response.type === "input_audio_buffer.speech_started") {
                  console.log(`[${new Date().toISOString()}] Detected user speech.`);
                  handleSpeechStartedEvent(openAiWs, socket);
                }
        
                if (
                  response.type === "response.content.done" ||
                  response.type === "response.done"
                ) {
                  console.log(`[${new Date().toISOString()}] LLM finished talking.`);
                }
              } catch (error) {
                console.error(
                  `[${new Date().toISOString()}] Error processing OpenAI message:`,
                  error,
                  "Raw message:",
                  event.data,
                );
              }
            };
            break;
          }
          case "mark":
            if (markQueue.length > 0) {
              markQueue.shift();
              
            }
            break;
          case "stop":
            callEndTime = Date.now();
            await saveAudio?.twilioStreamStop();
            break;
          default:
            console.log(
              `[${
                new Date().toISOString()
              }] Received non-media event: ${data.event}`,
            );
            break;
        }
      } catch (error) {
        console.error(
          `[${new Date().toISOString()}] Error parsing message:`,
          error,
          "Message:",
          event.data,
        );
      }
    };
  
  return response;
});

Deno.serve(app.fetch);
