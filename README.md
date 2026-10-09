# .env example

Create a file named `.env` in the project root and add:

```bash
VITE_YOUTUBE_API_KEY=your_youtube_data_api_key_here
```

Then start the app:

```bash
npm install
npm run dev
```

The app can:
- search YouTube videos by topic
- open a YouTube playlist from a URL
- play the selected video inside the app
- keep a clean light theme for easy reading

To get a YouTube API key:
1. Go to Google Cloud Console
2. Create a project
3. Enable the YouTube Data API v3
4. Create an API key
5. Add it to `.env`
