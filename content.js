console.log('content.js 載入');
// 檢查當前網頁是否符合條件
if (window.location.hostname.includes('chatgpt.com')) {
    console.log('網域正確 開始創建按鈕');

    // 檢查 document.readyState 並創建按鈕
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            console.log('開始創建按鈕 - DOMContentLoaded');
            createButton();
        });
    } else {
        console.log('開始創建按鈕 - 已完成加載');
        createButton();
    }

    function createButton() {
        const button = document.createElement('button');
        button.style.position = 'fixed';
        button.style.bottom = '20px';
        button.style.right = '20px';
        button.style.width = '50px';
        button.style.height = '50px';
        button.style.backgroundImage = `url('chrome-extension://${chrome.runtime.id}/icon.png')`;
        button.style.backgroundSize = 'contain';
        button.style.backgroundRepeat = 'no-repeat';
        button.style.backgroundPosition = 'center';
        button.style.cursor = 'pointer';
        button.style.zIndex = '9999';
        button.style.display = 'block';

        // 添加按鈕點擊事件處理器
        button.addEventListener('click', function() {
            createBlogList();
        });

        // 將按鈕添加到頁面中
        document.body.appendChild(button);
    }

    async function createBlogList() {
        // 創建方框元素
        const blogBox = document.createElement('div');
        blogBox.style.position = 'fixed';
        blogBox.style.bottom = '80px';
        blogBox.style.right = '20px';
        blogBox.style.width = '200px';
        blogBox.style.padding = '10px';
        blogBox.style.backgroundColor = '#fff';
        blogBox.style.border = '1px solid #000';
        blogBox.style.boxShadow = '0px 0px 10px rgba(0, 0, 0, 0.5)';
        blogBox.style.zIndex = '9999';

        // 創建關閉按鈕
        const closeButton = document.createElement('button');
        closeButton.textContent = 'X';
        closeButton.style.position = 'absolute';
        closeButton.style.top = '5px';
        closeButton.style.right = '5px';
        closeButton.style.border = 'none';
        closeButton.style.background = 'none';
        closeButton.style.cursor = 'pointer';
        closeButton.style.fontSize = '16px';
        closeButton.addEventListener('click', function() {
            document.body.removeChild(blogBox);
        });
        blogBox.appendChild(closeButton);

        try {
            // 從 config.json 中讀取部落格列表
            const response = await fetch(chrome.runtime.getURL('config.json'));
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const config = await response.json();
            const blogs = config.blogs;

            // 創建部落格列表
            blogs.forEach(function(blog) {
                const blogItem = document.createElement('div');
                blogItem.textContent = blog.name;
                blogItem.style.cursor = 'pointer';
                blogItem.style.marginBottom = '5px';
                blogItem.addEventListener('click', function() {
                    extractAndLogMainContent(blog, blogBox);
                });
                blogBox.appendChild(blogItem);
            });

            // 將方框添加到頁面中
            document.body.appendChild(blogBox);
        } catch (error) {
            console.error('讀取 config.json 時出錯:', error);
        }
    }

    function extractAndLogMainContent(blog, blogBox) {
        const xpathResult = document.evaluate(
            "/html/body/div[1]/div[5]/div/div/section/main",
            document,
            null,
            XPathResult.FIRST_ORDERED_NODE_TYPE,
            null
        );
        const targetElement = xpathResult.singleNodeValue;
        if (targetElement) {
            const htmlContent = targetElement.innerHTML;
            console.log('XPath 目標內容（HTML）:', htmlContent);

            // 將 HTML 轉換為 Markdown
            let markdownContent = simpleHtmlToMarkdown(htmlContent);
            console.log('轉換為 Markdown 的內容:', markdownContent);

            // 取得標題（第一行內容）並移除
            const lines = markdownContent.split('\n');
            const title = lines.shift().replace(/^#+\s*/, '').trim();
            markdownContent = lines.join('\n').trim();

            console.log('文章標題:', title);
            console.log('文章內容（去除標題）:', markdownContent);

            // 提交資料到 WordPress 並關閉小視窗
            submitToWordPress(blog, title, markdownContent);
            document.body.removeChild(blogBox);
        } else {
            console.log('無法找到指定的 XPath 元素');
        }
    }

    function simpleHtmlToMarkdown(html) {
        // 簡單地將 HTML 轉換為 Markdown 的函數，移除 <span> 等不必要的標籤
        return html
            .replace(/<h1>(.*?)<\/h1>/g, '# $1\n')
            .replace(/<h2>(.*?)<\/h2>/g, '## $1\n')
            .replace(/<h3>(.*?)<\/h3>/g, '### $1\n')
            .replace(/<h4>(.*?)<\/h4>/g, '#### $1\n')
            .replace(/<h5>(.*?)<\/h5>/g, '##### $1\n')
            .replace(/<h6>(.*?)<\/h6>/g, '###### $1\n')
            .replace(/<strong>(.*?)<\/strong>/g, '**$1**')
            .replace(/<em>(.*?)<\/em>/g, '*$1*')
            .replace(/<p>(.*?)<\/p>/g, '$1\n')
            .replace(/<br\s*\/?>/g, '\n')
            .replace(/<a href="(.*?)".*?>(.*?)<\/a>/g, '[$2]($1)')
            .replace(/<ul>\s*<li>(.*?)<\/li>\s*<\/ul>/g, '- $1\n')
            .replace(/<span.*?>(.*?)<\/span>/g, '$1')
            .replace(/<img.*?alt="(.*?)".*?>/g, '![$1]')
            .replace(/<pre><code>(.*?)<\/code><\/pre>/g, '```$1```')
            .replace(/<blockquote>(.*?)<\/blockquote>/g, '> $1\n')
            .replace(/<[^>]+>/g, '') // 移除所有其他的 HTML 標籤
            .trim();
    }

    async function submitToWordPress(blog, title, content) {
        try {
            const response = await fetch(blog.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Basic ${btoa(blog.token)}`
                },
                body: JSON.stringify({
                    title: title,
                    content: content,
                    status: 'draft'
                })
            });

            if (!response.ok) {
                throw new Error('提交到 WordPress 時出錯');
            }

            const result = await response.json();
            console.log('成功提交到 WordPress:', result);
            alert('草稿提交成功：' + title);
        } catch (error) {
            console.error('提交到 WordPress 時出錯:', error);
            alert('草稿提交失敗：' + error.message);
        }
    }
} else {
    console.log('當前頁面不符合 chatgpt.com 的條件');
}
