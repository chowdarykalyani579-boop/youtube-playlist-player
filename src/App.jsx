import { useMemo, useState } from 'react';

const API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY;

function App() {
  const [searchTerm, setSearchTerm] = useState('React tutorials');
  const [playlistUrl, setPlaylistUrl] = useState('');
  const [videos, setVideos] = useState([]);
  const [activeVideo, setActiveVideo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const hasApiKey = Boolean(API_KEY);

  const canLoadSearch = useMemo(() => {
    return hasApiKey && searchTerm.trim().length > 0;
  }, [hasApiKey, searchTerm]);

  const buildVideoMap = (items) => {
    return items
      .filter((item) => item?.id?.videoId || item?.snippet?.resourceId?.videoId)
      .map((item) => ({
        id: item.id?.videoId || item.snippet?.resourceId?.videoId,
        title: item.snippet?.title || 'Untitled video',
        description: item.snippet?.description || 'No description available.',
        channelTitle: item.snippet?.channelTitle || 'YouTube',
        thumbnail: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.medium?.url,
      }));
  };

  const handleSearch = async () => {
    if (!canLoadSearch) {
      setError('Please add your YouTube Data API key in the .env file before searching.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=10&type=video&q=${encodeURIComponent(
          searchTerm
        )}&key=${API_KEY}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch videos from YouTube.');
      }

      const data = await response.json();
      const results = buildVideoMap(data.items || []);
      setVideos(results);

      if (results.length > 0) {
        setActiveVideo(results[0]);
      } else {
        setActiveVideo(null);
        setError('No videos were found for this topic. Try another search.');
      }
    } catch (err) {
      setError(err.message || 'Something went wrong while searching videos.');
    } finally {
      setLoading(false);
    }
  };

  const handlePlaylistLoad = async () => {
    if (!hasApiKey) {
      setError('Please add your YouTube Data API key in the .env file before loading a playlist.');
      return;
    }

    const playlistId = extractPlaylistId(playlistUrl);

    if (!playlistId) {
      setError('Please enter a valid YouTube playlist URL or ID.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=15&playlistId=${playlistId}&key=${API_KEY}`
      );

      if (!response.ok) {
        throw new Error('Unable to load this playlist. Check the link and try again.');
      }

      const data = await response.json();
      const playlistVideos = (data.items || []).map((item) => ({
        id: item.snippet?.resourceId?.videoId || item.snippet?.thumbnails?.default?.url,
        title: item.snippet?.title || 'Untitled video',
        description: item.snippet?.description || 'No description available.',
        channelTitle: item.snippet?.channelTitle || 'YouTube',
        thumbnail: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.medium?.url,
      }));

      setVideos(playlistVideos.filter((video) => video.id && video.id !== 'Private video'));

      if (playlistVideos.length > 0) {
        setActiveVideo(playlistVideos[0]);
      } else {
        setActiveVideo(null);
        setError('This playlist does not contain any playable videos.');
      }
    } catch (err) {
      setError(err.message || 'Something went wrong while loading the playlist.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (event) => {
    if (event.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="app-shell">
      <div className="topbar">
        <div>
          <p className="eyebrow">Entertainment</p>
          <h1>YouTube Playlist Player</h1>
        </div>
      </div>

      <div className="controls-panel card">
        <div className="search-row">
          <div className="input-wrap wide">
            <label htmlFor="search-topic">Search topic</label>
            <input
              id="search-topic"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Search for videos or a topic"
            />
          </div>

          <button className="primary-button" onClick={handleSearch} disabled={loading || !canLoadSearch}>
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>

        <div className="playlist-row">
          <div className="input-wrap wide">
            <label htmlFor="playlist-url">YouTube playlist link</label>
            <input
              id="playlist-url"
              value={playlistUrl}
              onChange={(e) => setPlaylistUrl(e.target.value)}
              placeholder="Paste a YouTube playlist URL"
            />
          </div>

          <button className="secondary-button" onClick={handlePlaylistLoad} disabled={loading || !hasApiKey}>
            Load Playlist
          </button>
        </div>

        {!hasApiKey && (
          <div className="notice-box">
            Add your <code>VITE_YOUTUBE_API_KEY</code> in the <code>.env</code> file to enable live search and playlist loading.
          </div>
        )}

        {error && <div className="error-box">{error}</div>}
      </div>

      <div className="content-grid">
        <section className="video-panel card">
          {activeVideo ? (
            <>
              <div className="video-wrapper">
                <iframe
                  src={`https://www.youtube.com/embed/${activeVideo.id}?autoplay=1`}
                  title={activeVideo.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>

              <div className="video-meta">
                <h2>{activeVideo.title}</h2>
                <p>{activeVideo.channelTitle}</p>
                <p>{activeVideo.description}</p>
              </div>
            </>
          ) : (
            <div className="empty-state">
              <h2>Pick a topic or playlist</h2>
              <p>Your selected video will appear here.</p>
            </div>
          )}
        </section>

        <aside className="playlist-panel card">
          <div className="playlist-header">
            <h3>Playlist</h3>
            <span>{videos.length} items</span>
          </div>

          <div className="playlist-list">
            {videos.length > 0 ? (
              videos.map((video, index) => (
                <button
                  key={`${video.id}-${index}`}
                  className={`playlist-item ${activeVideo?.id === video.id ? 'active' : ''}`}
                  onClick={() => setActiveVideo(video)}
                >
                  <img src={video.thumbnail} alt={video.title} />
                  <div className="playlist-item-copy">
                    <strong>{video.title}</strong>
                    <span>{video.channelTitle}</span>
                  </div>
                </button>
              ))
            ) : (
              <div className="empty-playlist">No videos loaded yet.</div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

function extractPlaylistId(value) {
  if (!value) return '';

  const trimmed = value.trim();

  if (trimmed.includes('list=')) {
    const match = trimmed.match(/[?&]list=([^&]+)/);
    return match ? match[1] : '';
  }

  if (/^[A-Za-z0-9_-]{10,}$/.test(trimmed)) {
    return trimmed;
  }

  return '';
}

export default App;
