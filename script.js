const app = {
    // === СОСТОЯНИЕ ПРИЛОЖЕНИЯ ===
    data: [],
    state: {
        filter: 'all',
        search: '',
        sort: 'newest',
        currentPage: 1,
        itemsPerPage: 50
    },
    currentLesson: null,
    currentMode: 'full',
    
    quizState: {
        active: false,
        questions: [],
        currentIndex: 0,
        score: 0
    },

    // === ИНИЦИАЛИЗАЦИЯ ===
    init() {
        this.cacheDOM();
        this.configureMarkdown();
        this.bindEvents();
        this.initData();
        // Вызываем проверку URL в самом конце, когда всё уже отрендерено
        this.checkURLParams();
    },

    cacheDOM() {
        this.dom = {
            grid: document.getElementById('lesson-grid'),
            error: document.getElementById('error-msg'),
            searchInput: document.getElementById('search-input'),
            filtersContainer: document.getElementById('filters-container'),
            sortSelect: document.getElementById('sort-select'),
            
            pagination: document.getElementById('pagination'),
            prevBtn: document.getElementById('prev-page'),
            nextBtn: document.getElementById('next-page'),
            pageInfo: document.getElementById('page-info'),
            
            lessonScene: document.getElementById('scene-lesson'),
            lessonContent: document.getElementById('lesson-content'),
            lessonSubject: document.getElementById('lesson-subject-badge'),
            lessonDate: document.getElementById('lesson-date-display'),
            
            startQuizBtn: document.getElementById('start-quiz-btn'),
            quizScene: document.getElementById('scene-quiz'),
            quizContent: document.getElementById('quiz-content')
        };
    },

    configureMarkdown() {
        if (typeof marked === 'undefined') return;
        
        marked.setOptions({
            gfm: true,
            breaks: true,
            highlight: function(code, lang) {
                if (typeof hljs !== 'undefined') {
                    if (lang && hljs.getLanguage(lang)) {
                        return hljs.highlight(code, { language: lang }).value;
                    }
                    return hljs.highlightAuto(code).value;
                }
                return code;
            }
        });
    },

    // === ЖЕЛЕЗОБЕТОННЫЙ ПАРСЕР ФОРМУЛ ===
    parseMarkdownAndMath(rawText) {
        if (!rawText) return '';
        
        const mathBlocks = [];
        
        // Шаг 1: Прячем формулы ($$...$$ и $...$). 
        // Используем плейсхолдер БЕЗ подчеркиваний и звездочек, чтобы Markdown его не сломал!
        let processedText = rawText.replace(/(\$\$[\s\S]*?\$\$|\$[^$\n]+?\$)/g, (match) => {
            mathBlocks.push(match);
            return `MATHPLACEHOLDER${mathBlocks.length - 1}QWERT`;
        });

        // Шаг 2: Парсим безопасный текст в Markdown
        let html = marked.parse(processedText);

        // Шаг 3: Возвращаем формулы на их места
        mathBlocks.forEach((block, index) => {
            html = html.replace(`MATHPLACEHOLDER${index}QWERT`, block);
        });

        return html;
    },

    renderMath(elementsArray) {
        if (window.MathJax && window.MathJax.typesetPromise) {
            MathJax.typesetClear();
            MathJax.typesetPromise(elementsArray).catch((err) => console.error("MathJax error:", err));
        }
    },

    bindEvents() {
        this.dom.searchInput.addEventListener('input', (e) => {
            this.state.search = e.target.value.toLowerCase().trim();
            this.state.currentPage = 1;
            this.animateGridUpdate();
        });

        this.dom.sortSelect.addEventListener('change', (e) => {
            this.state.sort = e.target.value;
            this.state.currentPage = 1;
            this.animateGridUpdate();
        });

        this.dom.filtersContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('filter-btn')) {
                document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
                e.target.classList.add('active');
                this.state.filter = e.target.dataset.filter;
                this.state.currentPage = 1;
                this.animateGridUpdate();
            }
        });

        this.dom.prevBtn.addEventListener('click', () => this.changePage(-1));
        this.dom.nextBtn.addEventListener('click', () => this.changePage(1));
        
        this.dom.startQuizBtn.addEventListener('click', () => this.startQuiz());

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (this.quizState.active) this.closeQuiz();
                else if (this.dom.lessonScene.classList.contains('active')) this.closeLesson();
            }
        });
        
        // Корректная обработка кнопок "Вперед/Назад" в браузере
        window.addEventListener('popstate', (e) => {
            const params = new URLSearchParams(window.location.search);
            const lessonTitle = params.get('lesson');
            
            if (lessonTitle) {
                const lesson = this.data.find(l => l.title === lessonTitle);
                if (lesson) this.openLesson(lesson, false);
            } else {
                this.closeLesson(false);
            }
        });
    },

    initData() {
        if (typeof lessons !== 'undefined' && Array.isArray(lessons)) {
            this.data = lessons;
            this.generateFilters();
            this.render();
        } else {
            this.dom.error.textContent = 'Ошибка: Файл lessons.js не найден или пуст.';
            this.dom.error.style.display = 'block';
        }
    },

    generateFilters() {
        const subjects = [...new Set(this.data.map(item => item.subject))].sort();
        subjects.forEach(subject => {
            const btn = document.createElement('button');
            btn.className = 'filter-btn';
            btn.textContent = subject;
            btn.dataset.filter = subject;
            this.dom.filtersContainer.appendChild(btn);
        });
    },

    changePage(delta) {
        this.state.currentPage += delta;
        window.scrollTo({ top: 0, behavior: 'smooth' });
        this.animateGridUpdate();
    },

    animateGridUpdate() {
        this.dom.grid.style.opacity = '0';
        this.dom.grid.style.transform = 'translateY(15px)';
        
        setTimeout(() => {
            this.render();
            this.dom.grid.style.opacity = '1';
            this.dom.grid.style.transform = 'translateY(0)';
        }, 250);
    },

    getSubjectColor(subject) {
        const map = {
            'Алгебра': '#3b82f6', 'Геометрия': '#06b6d4', 'Математика': '#d4ae06', 'Физика': '#8b5cf6',
            'Химия': '#ec4899', 'Информатика': '#6366f1', 'Биология': '#10b981',
            'География': '#14b8a6', 'История': '#f59e0b', 'Обществознание': '#f97316',
            'Русский язык': '#ef4444', 'Литература': '#db2777', 'Английский язык': '#84cc16'
        };
        return map[subject] || '#a8a29e'; 
    },

    render() {
        let processedData = this.data.filter(item => {
            const dateObj = new Date(item.date);
            const dateStrRu = dateObj.toLocaleDateString('ru-RU'); 
            const dateStrFull = dateObj.toLocaleDateString('ru-RU', { month: 'long' }).toLowerCase();
            const searchLower = this.state.search;

            const matchesSearch = (
                item.title.toLowerCase().includes(searchLower) ||
                item.subject.toLowerCase().includes(searchLower) ||
                item.content.toLowerCase().includes(searchLower) ||
                (item.content_tiny && item.content_tiny.toLowerCase().includes(searchLower)) ||
                dateStrRu.includes(searchLower) || 
                dateStrFull.includes(searchLower)
            );

            const matchesFilter = this.state.filter === 'all' || item.subject === this.state.filter;
            return matchesSearch && matchesFilter;
        });

        processedData.sort((a, b) => {
            const d1 = new Date(a.date);
            const d2 = new Date(b.date);
            return this.state.sort === 'newest' ? d2 - d1 : d1 - d2;
        });

        const totalItems = processedData.length;
        const totalPages = Math.ceil(totalItems / this.state.itemsPerPage);
        
        if (this.state.currentPage > totalPages) this.state.currentPage = totalPages || 1;
        if (this.state.currentPage < 1) this.state.currentPage = 1;

        const start = (this.state.currentPage - 1) * this.state.itemsPerPage;
        const pageData = processedData.slice(start, start + this.state.itemsPerPage);

        this.dom.grid.innerHTML = '';
        
        if (totalItems === 0) {
            this.dom.grid.innerHTML = `
                <div style="text-align:center; padding: 4rem 1rem; color: var(--text-muted); font-size: 1.2rem; grid-column: 1/-1;">
                    <svg width="48" height="48" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="margin: 0 auto 1rem; opacity: 0.5;"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    <br>Ничего не найдено по вашему запросу
                </div>`;
            this.dom.pagination.style.display = 'none';
            this.dom.grid.style.display = 'block'; 
            return;
        }

        const createCardHTML = (lesson, index) => {
            const card = document.createElement('div');
            card.className = 'card';
            card.style.animationDelay = `${(index % 10) * 40}ms`; 
            
            const color = this.getSubjectColor(lesson.subject);
            const dateStr = new Date(lesson.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });

            card.innerHTML = `
                <div class="card-glow" style="background: ${color}"></div>
                <div class="card-body">
                    <div class="card-top">
                        <span class="subject-tag" style="color: ${color}; background: ${color}15; border-color: ${color}30">${lesson.subject}</span>
                        <span class="date-tag">${dateStr}</span>
                    </div>
                    <h3 class="card-title">${lesson.title}</h3>
                    <div class="card-arrow" style="color: ${color}">
                        Читать конспект <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3"/></svg>
                    </div>
                </div>
            `;
            card.onclick = () => this.openLesson(lesson);
            return card;
        };
        
        if (this.state.sort === 'newest' || this.state.sort === 'oldest') {
            this.dom.grid.style.display = 'block'; 
            
            const groups = {};
            pageData.forEach(item => {
                if (!groups[item.date]) groups[item.date] = [];
                groups[item.date].push(item);
            });

            const uniqueDates = [...new Set(pageData.map(item => item.date))];

            uniqueDates.forEach(date => {
                const dayGroup = document.createElement('div');
                dayGroup.className = 'day-group';
                
                const d = new Date(date);
                const today = new Date();
                const yesterday = new Date(); yesterday.setDate(today.getDate() - 1);

                let dayName = d.toLocaleDateString('ru-RU', { weekday: 'long' });
                dayName = dayName.charAt(0).toUpperCase() + dayName.slice(1);
                const dayDate = d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
                
                let badge = '';
                if (d.toDateString() === today.toDateString()) {
                    badge = `<span class="day-today">Сегодня</span>`;
                } else if (d.toDateString() === yesterday.toDateString()) {
                    badge = `<span class="day-today" style="background: rgba(255,255,255,0.1); box-shadow: none; color: #aaa;">Вчера</span>`;
                }

                dayGroup.innerHTML = `
                    <div class="day-header">
                        <div class="day-header-info">
                            <span class="day-name">${dayName}</span>
                            <span class="day-date">${dayDate}</span>
                        </div>
                        ${badge}
                    </div>
                    <div class="day-grid"></div>
                `;

                const gridContainer = dayGroup.querySelector('.day-grid');
                groups[date].forEach((lesson, idx) => gridContainer.appendChild(createCardHTML(lesson, idx)));
                this.dom.grid.appendChild(dayGroup);
            });

        } else {
            this.dom.grid.style.display = 'grid';
            pageData.forEach((lesson, index) => this.dom.grid.appendChild(createCardHTML(lesson, index)));
        }

        this.dom.pagination.style.display = totalPages > 1 ? 'flex' : 'none';
        this.dom.pageInfo.textContent = `${this.state.currentPage} / ${totalPages}`;
        this.dom.prevBtn.disabled = this.state.currentPage === 1;
        this.dom.nextBtn.disabled = this.state.currentPage === totalPages;
    },

    // === ПРОВЕРКА URL ПРИ ЗАГРУЗКЕ СТРАНИЦЫ ===
    checkURLParams() {
        const params = new URLSearchParams(window.location.search);
        const lessonTitle = params.get('lesson');
        
        if (lessonTitle) {
            const lesson = this.data.find(l => l.title === lessonTitle);
            if (lesson) {
                // Открываем без записи в историю, так как мы и так перешли по этой ссылке
                this.openLesson(lesson, false); 
            }
        }
    },

    // === ОТКРЫТИЕ УРОКА И ИЗМЕНЕНИЕ URL ===
    openLesson(lesson, pushState = true) {
        this.currentLesson = lesson;
        this.currentMode = 'full';
        
        if (lesson.quiz && Array.isArray(lesson.quiz) && lesson.quiz.length > 0) {
            this.dom.startQuizBtn.style.display = 'flex';
            this.quizState.questions = lesson.quiz;
        } else {
            this.dom.startQuizBtn.style.display = 'none';
            this.quizState.questions = [];
        }

        const color = this.getSubjectColor(lesson.subject);
        this.dom.lessonSubject.textContent = lesson.subject;
        this.dom.lessonSubject.style.backgroundColor = `${color}15`;
        this.dom.lessonSubject.style.color = color;
        this.dom.lessonSubject.style.borderColor = `${color}30`;
        
        this.dom.lessonDate.textContent = new Date(lesson.date).toLocaleDateString('ru-RU', { 
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
        });

        let toggleHTML = '';
        if (lesson.content_tiny) {
            toggleHTML = `
                <div class="content-toggle-wrapper fade-in">
                    <div class="content-toggle">
                        <div class="toggle-slider"></div>
                        <button class="toggle-btn active" data-mode="full" onclick="app.switchContentMode('full')">Подробно</button>
                        <button class="toggle-btn" data-mode="tiny" onclick="app.switchContentMode('tiny')">Кратко</button>
                    </div>
                </div>
            `;
        }

        this.dom.lessonContent.innerHTML = `
            ${toggleHTML}
            <div id="markdown-container" class="markdown-body">
                ${this.parseMarkdownAndMath(lesson.content)}
            </div>
        `;

        this.renderMath([this.dom.lessonContent]);

        this.dom.lessonScene.classList.add('active');
        document.body.style.overflow = 'hidden';

        // Правильное формирование URL с параметром
        if (pushState) {
            const url = new URL(window.location);
            url.searchParams.set('lesson', lesson.title);
            window.history.pushState({ lessonTitle: lesson.title }, '', url);
        }
        
        // Скролл вверх
        if (this.dom.lessonContent.parentElement) {
            this.dom.lessonContent.parentElement.scrollTop = 0;
        }
    },

    // === ПЕРЕКЛЮЧАТЕЛЬ "ПОДРОБНО / КРАТКО" ===
    switchContentMode(mode) {
        if (!this.currentLesson || this.currentMode === mode) return;
        this.currentMode = mode;
        
        const content = mode === 'tiny' ? this.currentLesson.content_tiny : this.currentLesson.content;
        const container = document.getElementById('markdown-container');
        
        container.style.opacity = '0';
        container.style.transform = 'translateY(5px)';
        
        document.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
        document.querySelector(`.toggle-btn[data-mode="${mode}"]`).classList.add('active');
        const slider = document.querySelector('.toggle-slider');
        slider.style.transform = mode === 'tiny' ? 'translateX(100%)' : 'translateX(0)';

        setTimeout(() => {
            container.innerHTML = this.parseMarkdownAndMath(content);
            this.renderMath([container]);
            container.style.opacity = '1';
            container.style.transform = 'translateY(0)';
        }, 200);
    },

    // === ЗАКРЫТИЕ УРОКА И ВОЗВРАТ URL ===
    closeLesson(pushState = true) {
        this.dom.lessonScene.classList.remove('active');
        
        if (pushState) {
            // Очищаем параметр 'lesson' из URL при закрытии
            const url = new URL(window.location);
            url.searchParams.delete('lesson');
            window.history.pushState({}, '', url);
        }
        
        setTimeout(() => {
            document.body.style.overflow = '';
            this.dom.lessonContent.innerHTML = ''; 
        }, 300);
    },

    // ==========================================
    //                 КВИЗ (ТЕСТЫ)
    // ==========================================
    
    startQuiz() {
        this.quizState.active = true;
        this.quizState.currentIndex = 0;
        this.quizState.score = 0;
        
        this.dom.quizScene.classList.add('active');
        this.renderQuizQuestion();
    },

    renderQuizQuestion() {
        const qIndex = this.quizState.currentIndex;
        const qData = this.quizState.questions[qIndex];
        const total = this.quizState.questions.length;

        let optionsHtml = qData.options.map((opt, i) => `
            <button class="quiz-option" onclick="app.checkQuizAnswer(${i}, this)">
                ${this.parseMarkdownAndMath(opt)}
            </button>
        `).join('');

        const html = `
            <div class="quiz-progress">Вопрос ${qIndex + 1} из ${total}</div>
            <div class="quiz-question">${this.parseMarkdownAndMath(qData.question)}</div>
            <div class="quiz-options">${optionsHtml}</div>
        `;
        
        this.dom.quizContent.style.opacity = '0';
        
        setTimeout(() => {
            this.dom.quizContent.innerHTML = html;
            this.renderMath([this.dom.quizContent]);
            this.dom.quizContent.style.opacity = '1';
        }, 150);
    },

    checkQuizAnswer(selectedIndex, btnElement) {
        const qData = this.quizState.questions[this.quizState.currentIndex];
        const isCorrect = (selectedIndex === qData.correct);
        const options = this.dom.quizContent.querySelectorAll('.quiz-option');

        options.forEach(opt => opt.disabled = true);

        if (isCorrect) {
            btnElement.classList.add('correct');
            this.quizState.score += 1;
        } else {
            btnElement.classList.add('wrong');
            options[qData.correct].classList.add('correct'); 
        }

        setTimeout(() => {
            this.quizState.currentIndex += 1;
            if (this.quizState.currentIndex < this.quizState.questions.length) {
                this.renderQuizQuestion();
            } else {
                this.showQuizResults();
            }
        }, 1200); 
    },

    showQuizResults() {
        const total = this.quizState.questions.length;
        const score = this.quizState.score;
        const percent = Math.round((score / total) * 100);
        
        let message = "Отличная работа! Тема усвоена.";
        if (percent < 50) message = "Стоит еще раз перечитать материал урока.";
        else if (percent < 100) message = "Хороший результат, но есть куда расти.";

        this.dom.quizContent.innerHTML = `
            <div class="quiz-result-screen">
                <div class="quiz-result-score">${score} / ${total}</div>
                <div class="quiz-result-text">${message}</div>
                <button class="action-btn" style="margin: 0 auto; padding: 14px 40px; font-size: 1.1rem;" onclick="app.closeQuiz()">
                    Вернуться к уроку
                </button>
            </div>
        `;
    },

    closeQuiz() {
        this.quizState.active = false;
        this.dom.quizScene.classList.remove('active');
        
        setTimeout(() => { 
            this.dom.quizContent.innerHTML = ''; 
        }, 300);
    }
};

document.addEventListener('DOMContentLoaded', () => app.init());