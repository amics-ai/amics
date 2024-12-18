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
let prefix: string | null = null;
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
    }

    socket.send(JSON.stringify({
      event: "clear",
      streamSid: streamSid,
    }));
    markQueue = [];
    lastAssistantItem = null;
    responseStartTimestamp = null;
  }
};

const saveConversation = async () => {
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
            text: "Greet the user",
          },
        ],
      },
    };

    openAiWs.send(JSON.stringify(initialConversationItem));
    openAiWs.send(JSON.stringify({ type: "response.create" }));
  };

  const { socket, response } = Deno.upgradeWebSocket(c.req.raw);

  socket.onclose = async () => {
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

            
           

            openAiWs.send(JSON.stringify(audioAppend));
          }
          break;
        case "start": {
          streamSid = data.start.streamSid;
          responseStartTimestamp = null;
          latestMediaTimestamp = 0;
          init = data.start.customParameters?.init === "true" ||
            data.start.customParameters?.init === true;
          VOICE = data.start.customParameters?.voice || "alloy";
          fromNumber = data.start.customParameters?.from;
          toNumber = data.start.customParameters?.to;
          prefix = data.start.customParameters?.prefix;
          saveAudio = new TwilioMediaStreamSaveAudio({
            supabaseClient: supabase,
            bucketName: "conversations",
            filePath: `${streamSid}/audio.wav`,
          });
        

          if (init) {
            console.log("Using init prompt...");
            SYSTEM_MESSAGE = await supabase.from("prompts").select("prompt").eq(
              "id",
              2,
            ).single().then((res) => res.data?.prompt);
            const locale = await supabase.from("phone_prefixes").select("primary_locale").eq("prefix", prefix).single().then((res) => res.data?.primary_locale);
            SYSTEM_MESSAGE = SYSTEM_MESSAGE + " \n\n" + "Speak to the user in this locale: " + locale + " \n\n" + "You are calling from this number: " + fromNumber + " \n\n"+ "The local date and time is: " + new Date().toLocaleString(locale)
            console.log(locale, new Date().toLocaleString(locale))
          } else {
            const [
              { data: promptData },
              { data: context, error: contextError },
            ] = await Promise.all([
              supabase.from("prompts").select("prompt").eq("id", 3).single(),
              supabase.from("context").select(
                "long_term_context, short_term_context",
              ).eq("phone_number", toNumber).single(),
            ]);
            SYSTEM_MESSAGE = promptData?.prompt;
            if (contextError) {
              console.error("Error getting context:", contextError);
            } else {
             
              SYSTEM_MESSAGE = SYSTEM_MESSAGE + " \n\n" +
                "Below is information about the user and highlights from previous conversations. You already met them. Use this context to make the interaction personalized and meaningful. Reference it subtly and naturally, as appropriate, for example by mentioning the user's name or referring to previous conversations." +
                " \n\n" + "Long Term Context: " + context?.long_term_context +
                " \n\n" + "Short Term Context: " + context?.short_term_context;
            }
          }
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
            setTimeout(() => {
              if (
                !goodbyeMessageSent && openAiWs &&
                openAiWs.readyState === WebSocket.OPEN
              ) {
                goodbyeMessageSent = true;
                const goodbyeMessage = {
                  type: "conversation.item.create",
                  item: {
                    type: "message",
                    role: "user",
                    content: [{
                      type: "input_text",
                      text:
                        "{198&*2p}",
                    }],
                  },
                };
  
                const noTurnSessionUpdate = {
                  type: "session.update",
                  session: {
                    turn_detection: { type: "none" },
                  },
                };
                openAiWs.send(JSON.stringify(noTurnSessionUpdate));
                //openAiWs.send(JSON.stringify({ type: "response.cancel" }));
                openAiWs.send(JSON.stringify(goodbyeMessage));
                //openAiWs.send(JSON.stringify({ type: "response.create" }));
  
                
              }
            }, 120000);
          };

          // Set initial start time from Twilio's timestamp
          callStartTime = Date.now();
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
                  
                }
                if (response.item_id) {
                  lastAssistantItem = response.item_id;
                }
                sendMark(socket, streamSid);
              }

              if (response.type === "input_audio_buffer.speech_started") {
                
                handleSpeechStartedEvent(openAiWs, socket);
              }
              if (response.type === "error") {
                console.error("ERROR", response)

              }
              
            } catch (error) {
              console.error(
                `[${
                  new Date().toISOString()
                }] Error processing OpenAI message:`,
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
