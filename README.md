# Amics - Your Open Source AI Phone Companion

[Amics](https://amics.ai) is an open-source AI companion that calls you regularly to check on your well-being and engage in meaningful conversations. Like a caring friend, it remembers your previous conversations and builds a genuine connection over time.

## Features

- 🤖 Natural, empathetic conversations powered by advanced AI
- 📞 Regular check-in phone calls
- 🧠 Maintains context and memories from previous conversations
- 🎙️ Real-time speech processing for fluid interactions
- 📝 Secure conversation recording and storage
- 👤 Personalized interactions based on user history

## Technical Architecture

Amics leverages modern cloud infrastructure for scalable, reliable operation:

- **Supabase Edge Functions**: Handles real-time conversation processing
- **Supabase PostgreSQL**: Stores user data and conversation history
- **Supabase Auth**: Manages user authentication
- **Supabase Storage**: Stores conversation recordings
- **OpenAI**: Powers natural language understanding and generation
- **Twilio**: Manages telephone communication


## Prerequisites

- Supabase account
- OpenAI API access
- Twilio account
- Deno installed
- Supabase CLI

## Environment Variables

- `OPENAI_API_KEY`: Your OpenAI API key
- `TWILIO_ACCOUNT_SID`: Your Twilio Account SID
- `TWILIO_AUTH_TOKEN`: Your Twilio Auth Token
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key
