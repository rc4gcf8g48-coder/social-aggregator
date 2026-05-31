const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
app.use(cors());
app.use(express.json());
const path = require('path');
app.use(express.static(path.join(__dirname)));

const YOUTUBE_API_KEY = 'AIzaSyD_C-9kMK-H0BJbRMRT4efsSOGhEReTC9U';

app.get('/search', async (req, res) => {
  const query = req.query.q;
  const results = [];

  try {
    const hnRes = await fetch(`https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(query)}&hitsPerPage=10`);
    const hnData = await hnRes.json();
    hnData.hits.forEach(hit => results.push({
      platform: 'HackerNews',
      title: hit.title || hit.story_title || 'Без заглавие',
      url: hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`,
      date: new Date(hit.created_at).toLocaleDateString(),
      author: hit.author, score: hit.points || 0, comments: hit.num_comments || 0
    }));
  } catch(e) { console.log('HN грешка:', e.message); }

  try {
    const ytRes = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&maxResults=10&type=video&key=${YOUTUBE_API_KEY}`);
    const ytData = await ytRes.json();
    ytData.items.forEach(item => results.push({
      platform: 'YouTube',
      title: item.snippet.title,
      url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
      date: new Date(item.snippet.publishedAt).toLocaleDateString(),
      author: item.snippet.channelTitle,
      score: 0, comments: 0,
      thumbnail: item.snippet.thumbnails.medium.url
    }));
  } catch(e) { console.log('YouTube грешка:', e.message); }

  try {
    const rdRes = await fetch(`https://api.reddit.com/search?q=${encodeURIComponent(query)}&limit=10&type=link`, { headers: { 'User-Agent': 'social-aggregator/1.0' } });
    const rdData = await rdRes.json();
    rdData.data.children.forEach(post => results.push({
      platform: 'Reddit',
      title: post.data.title,
      url: 'https://reddit.com' + post.data.permalink,
      date: new Date(post.data.created_utc * 1000).toLocaleDateString(),
      author: post.data.author, score: post.data.score, comments: post.data.num_comments
    }));
  } catch(e) { console.log('Reddit грешка:', e.message); }

  res.json(results);
});

app.listen(3000, () => console.log('Сървърът работи на http://localhost:3000'));
