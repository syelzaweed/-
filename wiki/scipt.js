let articlesData = [];          // 存储 articles.json 的数据
let currentSlug = null;        // 当前浏览的文章slug

document.addEventListener('DOMContentLoaded', async () => {
  await loadArticlesIndex();
  setupSearch();
  setupCategories();
  renderHome();

  // 点击 logo 回到首页
  document.getElementById('home-link').addEventListener('click', (e) => {
    e.preventDefault();
    history.pushState(null, '', window.location.pathname);
    currentSlug = null;
    renderHome();
  });

  // 处理浏览器前进后退
  window.addEventListener('popstate', () => {
    const slug = getSlugFromURL();
    if (slug) {
      loadArticle(slug, false);
    } else {
      currentSlug = null;
      renderHome();
    }
  });
});

// 加载文章索引
async function loadArticlesIndex() {
  try {
    const res = await fetch('articles.json');
    articlesData = await res.json();
  } catch (err) {
    console.error('无法加载文章索引', err);
    document.getElementById('content').innerHTML = '<p>加载失败，请检查 articles.json。</p >';
  }
}

// 设置搜索（实时过滤）
function setupSearch() {
  const input = document.getElementById('search-input');
  const dropdown = document.getElementById('search-results');

  input.addEventListener('input', () => {
    const query = input.value.trim().toLowerCase();
    if (!query) {
      dropdown.classList.add('hidden');
      return;
    }
    const matches = articlesData.filter(a =>
      a.title.toLowerCase().includes(query) ||
      a.tags.some(tag => tag.toLowerCase().includes(query)) ||
      a.summary.toLowerCase().includes(query)
    );
    if (matches.length === 0) {
      dropdown.innerHTML = '<div class="search-item">无匹配结果</div>';
    } else {
      dropdown.innerHTML = matches.slice(0, 8).map(m => `
        <div class="search-item" data-slug="${m.slug}">
          <strong>${highlight(m.title, query)}</strong>
          <small>${highlight(m.summary.substring(0, 50), query)}</small>
        </div>
      `).join('');
    }
    dropdown.classList.remove('hidden');

    // 点击搜索结果
    dropdown.querySelectorAll('.search-item').forEach(item => {
      item.addEventListener('click', () => {
        const slug = item.dataset.slug;
        input.value = '';
        dropdown.classList.add('hidden');
        navigateTo(slug);
      });
    });
  });

  // 点击外部关闭下拉
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-bar')) {
      dropdown.classList.add('hidden');
    }
  });
}

function highlight(text, query) {
  const regex = new RegExp(`(${query})`, 'gi');
  return text.replace(regex, '<mark>$1</mark>');
}

// 分类筛选
function setupCategories() {
  const categories = [...new Set(articlesData.map(a => a.category))];
  const list = document.getElementById('category-list');
  list.innerHTML = '<li data-category="all" class="active">全部</li>' +
    categories.map(c => `<li data-category="${c}">${c}</li>`).join('');

  list.querySelectorAll('li').forEach(li => {
    li.addEventListener('click', () => {
      list.querySelectorAll('li').forEach(l => l.classList.remove('active'));
      li.classList.add('active');
      const cat = li.dataset.category;
      currentSlug = null;
      history.pushState(null, '', window.location.pathname);
      renderHome(cat === 'all' ? null : cat);
    });
  });
}

// 渲染首页文章卡片
function renderHome(filterCategory = null) {
  const content = document.getElementById('content');
  let filtered = articlesData;
  if (filterCategory) {
    filtered = articlesData.filter(a => a.category === filterCategory);
  }
  if (filtered.length === 0) {
    content.innerHTML = '<p>该分类下暂无文章。</p >';
    return;
  }
  content.innerHTML = `
    <div class="article-list">
      ${filtered.map(a => `
        <div class="article-card" data-slug="${a.slug}">
          <h3>${a.title}</h3>
          <p>${a.summary}</p >
          <div class="tags">${a.tags.map(t => `<span class="tag">${t}</span>`).join('')}</div>
        </div>
      `).join('')}
    </div>
  `;
  // 绑定卡片点击
  document.querySelectorAll('.article-card').forEach(card => {
    card.addEventListener('click', () => {
      const slug = card.dataset.slug;
      navigateTo(slug);
    });
  });
}

// 路由与文章加载
async function loadArticle(slug, pushState = true) {
  const article = articlesData.find(a => a.slug === slug);
  if (!article) {
    document.getElementById('content').innerHTML = '<p>文章不存在</p >';
    return;
  }
  currentSlug = slug;
  if (pushState) {
    history.pushState(null, '', `?article=${slug}`);
  }
  const contentDiv = document.getElementById('content');
  contentDiv.innerHTML = '<p>加载中…</p >';
  try {
    const res = await fetch(`articles/${slug}.md`);
    if (!res.ok) throw new Error('加载失败');
    const mdText = await res.text();
    const html = marked.parse(mdText);
    contentDiv.innerHTML = `
      <div class="article-detail">
        <a href=" " class="back-link" id="back-btn">← 返回列表</a >
        <h2>${article.title}</h2>
        <div class="meta">
          分类: ${article.category} | 标签: ${article.tags.join(', ')}
        </div>
        <div class="content">${html}<
