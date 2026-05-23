/*
    ** 又用 Copilot 重新跑了一遍代码
    ** 看起来应该能跑
    ** 据说是添加了错误处理和加载状态显示
    ** 希望这坨代码不要出锅
    ** 能撑一点是一点（悲）
*/

// 配置常量 - 更清晰地命名和分组
const FURMEET_API_CONFIG = {
    MAX_DISPLAY_MEETS: 6,
    API_ENDPOINT: 'https://api.furrycons.cn/event/recent',
    DEFAULT_MAPPING: {
        name: '暂无名称',
        city: '未知城市',
        detail: '暂无详情',
        coverUrl: '',
        globalUrl: '#'
    },
    ERROR_MESSAGE_DURATION: 5000 // 错误信息显示时长（5秒）
};

// 错误处理模块
const errorHandler = {
    /** 显示错误信息 */
    show(message) {
        // 创建或获取错误容器
        let errorContainer = document.getElementById('furMeetErrorContainer');

        if (!errorContainer) {
            // 创建错误容器
            errorContainer = document.createElement('div');
            errorContainer.id = 'furMeetErrorContainer';
            errorContainer.style.cssText = `
                position: fixed;
                top: 20px;
                left: 50%;
                transform: translateX(-50%);
                background-color: #ffebee;
                color: #b71c1c;
                padding: 15px 25px;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                z-index: 1000;
                max-width: 90%;
                text-align: center;
                opacity: 0;
                transition: opacity 0.3s ease;
            `;
            document.body.appendChild(errorContainer);
        }

        // 设置错误信息
        errorContainer.textContent = message;
        errorContainer.style.opacity = '1';

        // 定时隐藏
        setTimeout(() => {
            errorContainer.style.opacity = '0';
            setTimeout(() => {
                errorContainer.textContent = '';
            }, 300);
        }, FURMEET_API_CONFIG.ERROR_MESSAGE_DURATION);
    },

    /** 隐藏错误信息 */
    hide() {
        const errorContainer = document.getElementById('furMeetErrorContainer');
        if (errorContainer) {
            errorContainer.style.opacity = '0';
            setTimeout(() => {
                errorContainer.textContent = '';
            }, 300);
        }
    }
};

// 预加载卡片元素 - 更清晰地初始化逻辑
function initializeMeetContainers() {
    const containers = [];
    for (let i = 1; i <= FURMEET_API_CONFIG.MAX_DISPLAY_MEETS; i++) {
        containers.push({
            id: i,
            name: document.getElementById(`FurMeet${i}Name`),
            cover: document.getElementById(`FurMeet${i}Cover`),
            city: document.getElementById(`FurMeet${i}City`),
            detail: document.getElementById(`FurMeet${i}Detail`),
            startDate: document.getElementById(`FurMeet${i}StartDate`),
            globalUrl: document.getElementById(`FurMeet${i}GlobalUrl`),
            card: document.getElementById(`MeetCard${i}`),
            coverBg: document.getElementById(`FurMeet${i}CoverBg`)
        });
    }
    return containers;
}

const meetContainers = initializeMeetContainers();

function cleanDescriptionText(text) {
    if (!text) return '';

    // 首先处理粗体标记：将 **text** 替换为 <strong>text</strong>
    let cleaned = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // 去除中括号标记（【】和[]）
    cleaned = cleaned.replace(/【[^】]*】/g, '')
        .replace(/\[[^\]]*]/g, '');

    // 将连续多个换行符缩减为一个换行符
    cleaned = cleaned.replace(/\n{2,}/g, '\n');

    // 将单个换行符替换为 <br> 标签
    cleaned = cleaned.replace(/\n/g, '<br>');

    return cleaned.trim();
}

// HTML 净化函数 - 防止 XSS 攻击
function sanitizeHTML(html) {
    if (!html) return '';
    
    // 创建临时 DOM 元素
    const temp = document.createElement('div');
    temp.innerHTML = html;
    
    // 只允许安全的标签
    const allowedTags = ['strong', 'b', 'br', 'p', 'em', 'i', 'u'];
    const elements = temp.querySelectorAll('*');
    
    // 遍历所有元素，移除不允许的标签
    elements.forEach(el => {
        if (!allowedTags.includes(el.tagName.toLowerCase())) {
            // 保留子节点内容，移除外层标签
            const fragment = document.createDocumentFragment();
            while (el.firstChild) {
                fragment.appendChild(el.firstChild);
            }
            el.parentNode.replaceChild(fragment, el);
        } else {
            // 移除所有属性（防止 onerror、onclick 等事件注入）
            while (el.attributes.length > 0) {
                el.removeAttribute(el.attributes[0].name);
            }
        }
    });
    
    return temp.innerHTML;
}

// 卡片管理模块
const cardManager = {
    /** 填充单个活动卡片 */
    populate(container, meetData) {
        if (!container || !meetData) return;

        const { name, cover, city, detail, startDate, globalUrl, coverBg } = container;
        const defaults = FURMEET_API_CONFIG.DEFAULT_MAPPING;

        // 文本内容设置
        if (name) name.textContent = meetData.name || defaults.name;
        if (city) city.textContent = meetData.city || defaults.city;
        if (startDate) {
            startDate.textContent = (meetData.startDate || '').substring(0, 10);
        }

        // 特殊处理详情文本（保留换行）- 使用 HTML 净化防止 XSS
        if (detail) {
            const cleanedText = cleanDescriptionText(meetData.detail || defaults.detail);
            detail.innerHTML = sanitizeHTML(cleanedText);
        }

        // 封面图片设置（主图和背景同步）
        const coverSrc = meetData.coverUrl || defaults.coverUrl;
        if (cover) cover.src = coverSrc;
        if (coverBg) coverBg.src = coverSrc;

        // 链接设置
        if (globalUrl) {
            globalUrl.href = meetData.globalUrl || defaults.globalUrl;
            globalUrl.target = "_blank";
        }
    },

    /** 隐藏未使用的卡片 */
    hideUnused(totalMeets) {
        const displayCount = Math.min(totalMeets, FURMEET_API_CONFIG.MAX_DISPLAY_MEETS);

        meetContainers.forEach((container, index) => {
            if (container.card) {
                container.card.style.display = index < displayCount
                    ? ''
                    : 'none';
            }
        });
    },

    /** 显示加载状态 */
    showLoading() {
        meetContainers.forEach(container => {
            if (container.card) {
                container.card.classList.add('loading-state');
            }
        });
    },

    /** 隐藏加载状态 */
    hideLoading() {
        meetContainers.forEach(container => {
            if (container.card) {
                container.card.classList.remove('loading-state');
            }
        });
    }
};

// API请求模块
async function fetchMeetData() {
    try {
        cardManager.showLoading();
        const response = await fetch(FURMEET_API_CONFIG.API_ENDPOINT);
        if (!response.ok) throw new Error(`API请求失败: ${response.status}`);

        const { total, data: meets } = await response.json();
        return { total, meets };
    } catch (error) {
        console.error('获取活动数据失败:', error);
        throw error;
    } finally {
        cardManager.hideLoading();
    }
}

// 主流程控制
async function initFurMeetDisplay() {
    try {
        const { total, meets } = await fetchMeetData();
        console.log(`API返回活动总数: ${total}`);

        cardManager.hideUnused(total);
        errorHandler.hide(); // 成功时隐藏错误信息

        const displayCount = Math.min(total, FURMEET_API_CONFIG.MAX_DISPLAY_MEETS);
        meets.slice(0, displayCount).forEach((meet, index) => {
            cardManager.populate(meetContainers[index], meet);
        });

    } catch (error) {
        // 错误处理：隐藏所有卡片
        cardManager.hideUnused(0);

        // 显示用户可见的错误提示
        const errorMessage = `加载活动信息失败，请稍后再试。(${error.message || '网络错误'})`;
        errorHandler.show(errorMessage);
    }
}

// 初始化执行
document.addEventListener('DOMContentLoaded', () => {
    // 添加延迟加载以避免阻塞主线程
    setTimeout(initFurMeetDisplay, 100);
});