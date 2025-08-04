let topics = [];
let links = {};

// Initialization
document.addEventListener('DOMContentLoaded', () => {
  // Load data and prompt restore backup once if available
  chrome.storage.sync.get('backup_restored', (flags) => {
    if (!flags.backup_restored) {
      getLatestBackup((backup) => {
        if (backup) {
          if (confirm('Backup data found. Do you want to restore previous saved data?')) {
            chrome.storage.sync.set({ topics: backup.topics, links: backup.links, backup_restored: true }, () => {
              location.reload();
            });
          } else {
            chrome.storage.sync.set({ backup_restored: true });
            loadData();
          }
        } else {
          loadData();
        }
      });
    } else {
      loadData();
    }
  });

  // Event listeners
  document.getElementById('add-topic').onclick = addTopic;
  document.getElementById('topic-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') addTopic();
  });

  document.getElementById('add-link').onclick = addLink;
  document.getElementById('link-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') addLink();
  });

  document.getElementById('back-to-topics').onclick = () => {
    document.getElementById('links-section').style.display = 'none';
    document.getElementById('topic-input').focus();
  };

  // Import/export backup event handlers
  document.getElementById('export-data').onclick = exportData;
  document.getElementById('import-data').onclick = () =>
    document.getElementById('import-file').click();
  document.getElementById('import-file').addEventListener('change', importData);
});

// Load saved topics and links
function loadData() {
  chrome.storage.sync.get(['topics', 'links'], data => {
    topics = data.topics || [];
    links = data.links || {};
    renderTopics();
    document.getElementById('links-section').style.display = 'none';
  });
}

// Save current data and create backup
function saveData() {
  chrome.storage.sync.set({ topics, links }, saveBackup);
}

// Add a new topic
function addTopic() {
  const input = document.getElementById('topic-input');
  const topic = input.value.trim();
  if (!topic) return alert('Please enter a topic name.');
  if (topics.includes(topic)) return alert('Topic already exists.');

  topics.push(topic);
  links[topic] = [];
  saveData();
  renderTopics();
  input.value = '';
}

// Display all topics
function renderTopics() {
  const list = document.getElementById('topic-list');
  list.innerHTML = '';
  topics.forEach(topic => {
    const li = document.createElement('li');
    li.style.display = 'flex';
    li.style.alignItems = 'center';
    li.style.justifyContent = 'space-between';

    const span = document.createElement('span');
    span.textContent = topic;
    span.style.flex = '1';
    span.style.cursor = 'pointer';
    span.onclick = () => showLinks(topic);

    const delBtn = document.createElement('button');
    delBtn.textContent = '✕';
    delBtn.title = `Delete topic: ${topic}`;
    delBtn.style.background = 'linear-gradient(90deg, #fee2e2, #f43f5e)';
    delBtn.style.color = '#fff';
    delBtn.style.padding = '4px 10px';
    delBtn.style.fontSize = '13px';
    delBtn.style.borderRadius = '5px';
    delBtn.style.marginLeft = '8px';
    delBtn.style.border = 'none';
    delBtn.style.cursor = 'pointer';
    delBtn.onclick = (e) => {
      e.stopPropagation();
      if (confirm(`Are you sure you want to delete the topic "${topic}" and all its links?`)) {
        topics = topics.filter(t => t !== topic);
        delete links[topic];
        saveData();
        document.getElementById('links-section').style.display = 'none';
        renderTopics();
      }
    };

    li.appendChild(span);
    li.appendChild(delBtn);
    list.appendChild(li);
  });
}

// Show links of a selected topic
function showLinks(topic) {
  const linksSection = document.getElementById('links-section');
  linksSection.style.display = 'block';
  document.getElementById('current-topic').textContent = topic;
  renderLinks(topic);
}

// Render all links for a topic with favicons
function renderLinks(topic) {
  const linkList = document.getElementById('link-list');
  linkList.innerHTML = '';
  if (!links[topic]) links[topic] = [];

  links[topic].forEach((link, idx) => {
    const li = document.createElement('li');

    const faviconUrl = 'https://www.google.com/s2/favicons?sz=32&domain_url=' + encodeURIComponent(link);
    const favImg = document.createElement('img');
    favImg.src = faviconUrl;
    favImg.style.width = '20px';
    favImg.style.marginRight = '8px';
    favImg.style.borderRadius = '3px';

    const a = document.createElement('a');
    a.href = link;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.textContent = getLinkName(link);

    const delBtn = document.createElement('button');
    delBtn.textContent = 'Delete';
    delBtn.title = 'Delete this link';
    delBtn.onclick = () => {
      if (confirm('Delete this link?')) {
        links[topic].splice(idx, 1);
        saveData();
        renderLinks(topic);
      }
    };

    li.appendChild(favImg);
    li.appendChild(a);
    li.appendChild(delBtn);
    linkList.appendChild(li);
  });
}

// Add a new link to current topic
function addLink() {
  const input = document.getElementById('link-input');
  const url = input.value.trim();
  const currentTopic = document.getElementById('current-topic').textContent;

  if (!url) return alert('Please enter a link.');
  if (!currentTopic) return alert('Please select a topic first.');
  if (!isValidUrl(url)) return alert('Please enter a valid URL (starting with http:// or https://)');
  if (links[currentTopic] && links[currentTopic].includes(url)) return alert('Link already exists in this topic.');

  if (!links[currentTopic]) links[currentTopic] = [];
  links[currentTopic].push(url);
  saveData();
  renderLinks(currentTopic);
  input.value = '';
}

// Map URL to easy-readable site names
function getLinkName(url) {
  const linkNames = {
    'steam': 'Steam',
    'epicgames': 'Epic Games',
    'gog': 'GOG',
    'itch': 'itch.io',
    'alienwarearena': 'Alienware Arena',
    'ubisoft': 'Ubisoft'
  };
  try {
    const u = new URL(url);
    for (const key in linkNames) {
      if (u.hostname.includes(key)) return linkNames[key];
    }
    const domain = u.hostname.replace('www.', '').split('.')[0];
    return domain.charAt(0).toUpperCase() + domain.slice(1);
  } catch {
    return url;
  }
}

// Validate URL format
function isValidUrl(string) {
  try {
    const url = new URL(string);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

// Save backup with timestamp in storage
function saveBackup() {
  chrome.storage.sync.get(['topics', 'links'], (data) => {
    if (data.topics && data.links) {
      const timestamp = new Date().toISOString();
      const backupKey = `backup_${timestamp}`;
      chrome.storage.sync.set({ [backupKey]: { topics: data.topics, links: data.links } });
    }
  });
}

// Get latest backup from storage
function getLatestBackup(callback) {
  chrome.storage.sync.get(null, (allData) => {
    const backups = Object.keys(allData)
      .filter(key => key.startsWith('backup_'))
      .sort()
      .reverse();
    if (backups.length > 0) {
      callback(allData[backups[0]]);
    } else {
      callback(null);
    }
  });
}
