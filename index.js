const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

const YOUTUBE_API_KEY = 'AIzaSyD_C-9kMK-H0BJbRMRT4efsSOGhEReTC9U';
const FB_APP_ID = '1494346312175079';
const FB_APP_SECRET = '36f8ac439f884b5942f3eac633f173bf';

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

  try {
    const fbToken = `${FB_APP_ID}|${FB_APP_SECRET}`;
    const fbRes = await fetch(`https://graph.facebook.com/v18.0/pages/search?q=${encodeURIComponent(query)}&fields=name,posts{message,created_time,permalink_url}&access_token=${fbToken}`);
    const fbData = await fbRes.json();
    if (fbData.data) {
      fbData.data.forEach(page => {
        if (page.posts && page.posts.data) {
          page.posts.data.forEach(post => {
            if (post.message) {
              results.push({
                platform: 'Facebook',
                title: post.message.substring(0, 150),
                url: post.permalink_url,
                date: new Date(post.created_time).toLocaleDateString(),
                author: page.name,
                score: 0, comments: 0
              });
            }
          });
        }
      });
    }
  } catch(e) { console.log('Facebook грешка:', e.message); }

  res.json(results);
});

app.listen(3000, () => console.log('Сървърът работи на http://localhost:3000'));
