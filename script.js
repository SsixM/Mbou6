const app = {
    data: [],
    state: {
        filter: 'all',
        search: '',
        sort: 'newest',
        currentPage: 1,
        itemsPerPage: 50
    },
    // Храним текущий открытый урок и его режим для переключателя
    currentLesson: null,
    currentMode: 'full',

    init() {
        this.cacheDOM();
        this.bindEvents();
        this.initData();
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
            lessonDate: document.getElementById('lesson-date-display')
        };
    },

    bindEvents() {
        this.dom.searchInput.addEventListener('input', (e) => {
            this.state.search = e.target.value.toLowerCase().trim();
            this.state.currentPage = 1;
            this.animateGridUpdate();
        });

        this.dom.sortSelect.addEventListener('change', (e) => {
            this.state.sort = e.target.value;
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
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.closeLesson();
        });
        
        window.addEventListener('popstate', (e) => {
            if (e.state && e.state.lessonTitle) {
                const lesson = this.data.find(l => l.title === e.state.lessonTitle);
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
            this.dom.error.textContent = 'Ошибка загрузки данных';
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
        this.dom.grid.style.transform = 'translateY(10px)';
        
        setTimeout(() => {
            this.render();
            this.dom.grid.style.opacity = '1';
            this.dom.grid.style.transform = 'translateY(0)';
        }, 200);
    },

    getSubjectColor(subject) {
        const map = {
            'Алгебра': '#3b82f6',
            'Геометрия': '#06b6d4',
            'Физика': '#8b5cf6',
            'Химия': '#ec4899',
            'Информатика': '#6366f1',
            'Математика': '#2563eb',
            'Астрономия': '#4338ca',
            'Биология': '#10b981',
            'География': '#14b8a6',
            'Экология': '#059669',
            'История': '#f59e0b',
            'Обществознание': '#f97316',
            'Философия': '#78350f',
            'Право': '#b91c1c',
            'Русский язык': '#ef4444',
            'Литература': '#db2777',
            'Английский язык': '#84cc16',
            'Иностранный язык': '#a3e635',
            'Физкультура': '#fbbf24',
            'ОБЖ': '#dc2626',
            'МХК': '#d946ef',
            'Изо': '#f472b6',
            'Музыка': '#2dd4bf',
            'Технология': '#71717a',
        };
        return map[subject] || '#a8a29e'; 
    },

    render() {
        let processedData = this.data.filter(item => {
            const dateObj = new Date(item.date);
            const dateStrRu = dateObj.toLocaleDateString('ru-RU'); 
            const dateStrFull = dateObj.toLocaleDateString('ru-RU', { month: 'long' }).toLowerCase();

            const matchesSearch = (
                item.title.toLowerCase().includes(this.state.search) ||
                item.subject.toLowerCase().includes(this.state.search) ||
                item.content.toLowerCase().includes(this.state.search) ||
                dateStrRu.includes(this.state.search) || 
                dateStrFull.includes(this.state.search)
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
            this.dom.grid.innerHTML = `<div class="empty-placeholder">Ничего не найдено 👻</div>`;
            this.dom.pagination.style.display = 'none';
            this.dom.grid.style.display = 'grid'; 
            this.dom.grid.style.gridTemplateColumns = '1fr';
            return;
        }

        const createCardHTML = (lesson, index) => {
            const card = document.createElement('div');
            card.className = 'card';
            card.style.animationDelay = `${(index % 10) * 50}ms`; 
            
            const color = this.getSubjectColor(lesson.subject);
            const dateStr = new Date(lesson.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });

            card.innerHTML = `
                <div class="card-glow" style="background: ${color}"></div>
                <div class="card-body">
                    <div class="card-top">
                        <span class="subject-tag" style="color: ${color}; border-color: ${color}40">${lesson.subject}</span>
                        <span class="date-tag">${dateStr}</span>
                    </div>
                    <h3 class="card-title">${lesson.title}</h3>
                    <div class="card-arrow" style="color: ${color}">
                        Читать <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3"/></svg>
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
                const dateKey = item.date; 
                if (!groups[dateKey]) groups[dateKey] = [];
                groups[dateKey].push(item);
            });

            const uniqueDates = [...new Set(pageData.map(item => item.date))];

            uniqueDates.forEach(date => {
                const itemsInDay = groups[date];
                const dayGroup = document.createElement('div');
                dayGroup.className = 'day-group';
                
                const d = new Date(date);
                const today = new Date();
                const yesterday = new Date();
                yesterday.setDate(today.getDate() - 1);

                let dayName = d.toLocaleDateString('ru-RU', { weekday: 'long' });
                dayName = dayName.charAt(0).toUpperCase() + dayName.slice(1);

                const dayDate = d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
                
                let badge = '';
                if (d.toDateString() === today.toDateString()) {
                    badge = `<span class="day-today">Сегодня</span>`;
                } else if (d.toDateString() === yesterday.toDateString()) {
                    badge = `<span class="day-today" style="background: var(--text-muted); box-shadow: none;">Вчера</span>`;
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
                itemsInDay.forEach((lesson, idx) => {
                    gridContainer.appendChild(createCardHTML(lesson, idx));
                });

                this.dom.grid.appendChild(dayGroup);
            });

        } else {
            this.dom.grid.style.display = 'grid';
            this.dom.grid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(320px, 1fr))';
            
            pageData.forEach((lesson, index) => {
                this.dom.grid.appendChild(createCardHTML(lesson, index));
            });
        }

        this.dom.pagination.style.display = totalPages > 1 ? 'flex' : 'none';
        this.dom.pageInfo.textContent = `${this.state.currentPage} / ${totalPages}`;
        this.dom.prevBtn.disabled = this.state.currentPage === 1;
        this.dom.nextBtn.disabled = this.state.currentPage === totalPages;
    },

    openLesson(lesson, pushState = true) {
        this.currentLesson = lesson;
        this.currentMode = 'full';

        const color = this.getSubjectColor(lesson.subject);
        
        this.dom.lessonSubject.textContent = lesson.subject;
        this.dom.lessonSubject.style.backgroundColor = `${color}20`;
        this.dom.lessonSubject.style.color = color;
        this.dom.lessonSubject.style.borderColor = color;
        
        this.dom.lessonDate.textContent = new Date(lesson.date).toLocaleDateString('ru-RU', { 
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
        });

        // Формируем красивый переключатель, только если есть content_tiny
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
                ${marked.parse(lesson.content)}
            </div>
        `;

        if (window.MathJax && window.MathJax.typesetPromise) {
            MathJax.typesetPromise([this.dom.lessonContent]).catch(console.error);
        }

        this.dom.lessonScene.classList.add('active');
        document.body.style.overflow = 'hidden';

        if (pushState) {
            const lessonId = encodeURIComponent(lesson.title);
            window.history.pushState({ lessonTitle: lesson.title }, '', `?lesson=${lessonId}`);
        }
    },

    // Метод переключения (с анимацией)
    switchContentMode(mode) {
        if (!this.currentLesson || this.currentMode === mode) return;
        this.currentMode = mode;
        
        const content = mode === 'tiny' ? this.currentLesson.content_tiny : this.currentLesson.content;
        const container = document.getElementById('markdown-container');
        
        // Анимация исчезновения
        container.style.opacity = '0';
        container.style.transform = 'translateY(5px)';
        
        // Обновление UI кнопок
        const btns = document.querySelectorAll('.toggle-btn');
        const slider = document.querySelector('.toggle-slider');
        
        btns.forEach(b => b.classList.remove('active'));
        const activeBtn = document.querySelector(`.toggle-btn[data-mode="${mode}"]`);
        activeBtn.classList.add('active');
        
        if (mode === 'tiny') {
            slider.style.transform = 'translateX(100%)';
        } else {
            slider.style.transform = 'translateX(0)';
        }

        // Рендер нового текста с задержкой под анимацию
        setTimeout(() => {
            container.innerHTML = marked.parse(content);
            if (window.MathJax && window.MathJax.typesetPromise) {
                MathJax.typesetPromise([container]).catch(console.error);
            }
            container.style.opacity = '1';
            container.style.transform = 'translateY(0)';
        }, 200);
    },

    closeLesson(pushState = true) {
        this.dom.lessonScene.classList.remove('active');
        
        if (pushState) {
            window.history.pushState({}, '', window.location.pathname);
        }

        setTimeout(() => {
            document.body.style.overflow = '';
            this.dom.lessonContent.innerHTML = ''; 
        }, 300);
    },

    checkURLParams() {
        const params = new URLSearchParams(window.location.search);
        const lessonTitle = params.get('lesson');
        
        if (lessonTitle) {
            const decodedTitle = decodeURIComponent(lessonTitle);
            const lesson = this.data.find(l => l.title === decodedTitle);
            if (lesson) {
                setTimeout(() => this.openLesson(lesson, false), 100);
            }
        }
    }
};

document.addEventListener('DOMContentLoaded', () => app.init());