import { SupabaseClient } from "jsr:@supabase/supabase-js@2";

class TwilioMediaStreamSaveToSupabase {
  private bucketName: string;
  private filePath: string;
  private supabaseClient: SupabaseClient;
  private chunks: Uint8Array[] = [];

  constructor(options: { bucketName: string, filePath: string, supabaseClient: SupabaseClient }) {
    this.bucketName = options.bucketName;
    this.filePath = options.filePath;
    this.supabaseClient = options.supabaseClient;
  }

  async twilioStreamStart(): Promise<void> {
    // Initialize the file with a Mu-law WAV header for compatibility with Twilio's format
    const header = new Uint8Array([
      0x52, 0x49, 0x46, 0x46, 0xff, 0xff, 0xff, 0xff, 0x57, 0x41, 0x56, 0x45, 0x66, 0x6d, 0x74,
      0x20, 0x12, 0x00, 0x00, 0x00, 0x07, 0x00, 0x01, 0x00, 0x40, 0x1f, 0x00, 0x00, 0x80, 0x3e,
      0x00, 0x00, 0x02, 0x00, 0x04, 0x00, 0x10, 0x00, 0x64, 0x61, 0x74, 0x61, 0xff, 0xff, 0xff,
      0xff
    ]);
    this.chunks.push(header);
  }

  twilioStreamMedia(mediaPayload: string): void {
    const audioData = Uint8Array.from(atob(mediaPayload), c => c.charCodeAt(0));
    this.chunks.push(audioData);
  }

  async twilioStreamStop(): Promise<{ data: { path: string }; error: any }> {
    const blob = new Blob(this.chunks, { type: 'audio/wav' });
    const arrayBuffer = await blob.arrayBuffer();
    const finalBuffer = new Uint8Array(arrayBuffer);
    const result = await this.uploadToSupabase(finalBuffer);
    return { data: { path: this.filePath }, error: result.error };
  }

  private async uploadToSupabase(data: Uint8Array): Promise<{ data: { path: string }; error: any }> {
    const file = new File([data], this.filePath, { type: 'audio/wav' });
    const { error } = await this.supabaseClient.storage
      .from(this.bucketName)
      .upload(this.filePath, file);

    if (error) console.error("Error saving conversation:", error);
    return { data: { path: this.filePath }, error: error };
  }
}

export default TwilioMediaStreamSaveToSupabase;
