const app = {
    data: [],
    state: {
        filter: 'all',
        search: '',
        sort: 'newest',
        currentPage: 1,
        itemsPerPage: 50
    },

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
        // Поиск
        this.dom.searchInput.addEventListener('input', (e) => {
            this.state.search = e.target.value.toLowerCase().trim();
            this.state.currentPage = 1;
            this.animateGridUpdate();
        });

        // Сортировка
        this.dom.sortSelect.addEventListener('change', (e) => {
            this.state.sort = e.target.value;
            this.animateGridUpdate();
        });

        // Фильтры
        this.dom.filtersContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('filter-btn')) {
                document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
                e.target.classList.add('active');
                this.state.filter = e.target.dataset.filter;
                this.state.currentPage = 1;
                this.animateGridUpdate();
            }
        });

        // Пагинация
        this.dom.prevBtn.addEventListener('click', () => this.changePage(-1));
        this.dom.nextBtn.addEventListener('click', () => this.changePage(1));
        
        // ESC закрывает модалку
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

    // Плавная смена контента сетки
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
        // Неоновые цвета (Tailwind Palette)
        const map = {
            // Точные науки
            'Алгебра': '#3b82f6',        // Blue
            'Геометрия': '#06b6d4',      // Cyan
            'Физика': '#8b5cf6',         // Violet
            'Химия': '#ec4899',          // Pink
            'Информатика': '#6366f1',    // Indigo
            'Математика': '#2563eb',     // Royal Blue
            'Астрономия': '#4338ca',     // Indigo/Deep Blue

            // Естественные науки
            'Биология': '#10b981',       // Emerald
            'География': '#14b8a6',      // Teal
            'Экология': '#059669',       // Green

            // Гуманитарные науки
            'История': '#f59e0b',        // Amber
            'Обществознание': '#f97316', // Orange
            'Философия': '#78350f',      // Brown/Amber
            'Право': '#b91c1c',          // Red

            // Языки и литература
            'Русский язык': '#ef4444',    // Red
            'Литература': '#db2777',     // Pink/Rose
            'Английский язык': '#84cc16', // Lime
            'Иностранный язык': '#a3e635',// Light Lime

            // Прочее
            'Физкультура': '#fbbf24',    // Yellow
            'ОБЖ': '#dc2626',            // Bright Red
            'МХК': '#d946ef',            // Fuchsia
            'Изо': '#f472b6',            // Light Pink
            'Музыка': '#2dd4bf',         // Turquoise
            'Технология': '#71717a',     // Zinc/Gray
        };

        return map[subject] || '#a8a29e'; // Стандартный серый для неизвестных предметов
    },

render() {
        // 1. ЛОГИКА ПОИСКА
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

        // 2. СОРТИРОВКА
        processedData.sort((a, b) => {
            const d1 = new Date(a.date);
            const d2 = new Date(b.date);
            return this.state.sort === 'newest' ? d2 - d1 : d1 - d2;
        });

        // 3. ПАГИНАЦИЯ
        const totalItems = processedData.length;
        const totalPages = Math.ceil(totalItems / this.state.itemsPerPage);
        
        if (this.state.currentPage > totalPages) this.state.currentPage = totalPages || 1;
        if (this.state.currentPage < 1) this.state.currentPage = 1;

        const start = (this.state.currentPage - 1) * this.state.itemsPerPage;
        const pageData = processedData.slice(start, start + this.state.itemsPerPage);

        // 4. ОЧИСТКА СЕТКИ
        this.dom.grid.innerHTML = '';
        
        if (totalItems === 0) {
            this.dom.grid.innerHTML = `<div class="empty-placeholder">Ничего не найдено 👻</div>`;
            this.dom.pagination.style.display = 'none';
            // Восстанавливаем Grid для сообщения об ошибке
            this.dom.grid.style.display = 'grid'; 
            this.dom.grid.style.gridTemplateColumns = '1fr';
            return;
        }

        // --- ГЕНЕРАТОР КАРТОЧКИ (Внутренняя функция) ---
        const createCardHTML = (lesson, index) => {
            const card = document.createElement('div');
            card.className = 'card';
            // Анимация задержки
            card.style.animationDelay = `${(index % 10) * 50}ms`; 
            
            const color = this.getSubjectColor(lesson.subject);
            // Формат даты: "2 фев"
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

        // 5. ОТРИСОВКА (С группировкой или без)
        
        // Если сортировка по дате -> включаем режим "МЭШ" (группировка)
        if (this.state.sort === 'newest' || this.state.sort === 'oldest') {
            this.dom.grid.style.display = 'block'; // Убираем CSS Grid с контейнера
            
            // Группируем текущую страницу данных по датам
            const groups = {};
            pageData.forEach(item => {
                const dateKey = item.date; 
                if (!groups[dateKey]) groups[dateKey] = [];
                groups[dateKey].push(item);
            });

            // Получаем уникальные даты в правильном порядке
            // (Set сохраняет порядок вставки, а processedData уже отсортирован)
            const uniqueDates = [...new Set(pageData.map(item => item.date))];

            uniqueDates.forEach(date => {
                const itemsInDay = groups[date];
                const dayGroup = document.createElement('div');
                dayGroup.className = 'day-group';
                
                // --- Форматирование даты ---
                const d = new Date(date);
                const today = new Date();
                const yesterday = new Date();
                yesterday.setDate(today.getDate() - 1);

                let dayName = d.toLocaleDateString('ru-RU', { weekday: 'long' });
                dayName = dayName.charAt(0).toUpperCase() + dayName.slice(1);

                const dayDate = d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
                
                // Проверка на сегодня/вчера
                let badge = '';
                if (d.toDateString() === today.toDateString()) {
                    badge = `<span class="day-today">Сегодня</span>`;
                } else if (d.toDateString() === yesterday.toDateString()) {
                    badge = `<span class="day-today" style="background: var(--text-muted)">Вчера</span>`;
                }

                dayGroup.innerHTML = `
                    <div class="day-header">
                        <span class="day-name">${dayName}</span>
                        <span class="day-date">${dayDate}</span>
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
            // ОБЫЧНЫЙ РЕЖИМ (Сетка) - для сортировки не по дате
            this.dom.grid.style.display = 'grid';
            this.dom.grid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(320px, 1fr))';
            
            pageData.forEach((lesson, index) => {
                this.dom.grid.appendChild(createCardHTML(lesson, index));
            });
        }

        // Обновляем контролы пагинации
        this.dom.pagination.style.display = totalPages > 1 ? 'flex' : 'none';
        this.dom.pageInfo.textContent = `${this.state.currentPage} / ${totalPages}`;
        this.dom.prevBtn.disabled = this.state.currentPage === 1;
        this.dom.nextBtn.disabled = this.state.currentPage === totalPages;
    },

openLesson(lesson, pushState = true) {
    this.dom.lessonContent.innerHTML = marked.parse(lesson.content);
    
    const color = this.getSubjectColor(lesson.subject);
    this.dom.lessonSubject.textContent = lesson.subject;
    this.dom.lessonSubject.style.backgroundColor = `${color}20`;
    this.dom.lessonSubject.style.color = color;
    this.dom.lessonSubject.style.borderColor = color;
    
    this.dom.lessonDate.textContent = new Date(lesson.date).toLocaleDateString('ru-RU', { 
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
    });

    if (window.MathJax && window.MathJax.typesetPromise) {
        MathJax.typesetPromise([this.dom.lessonContent]).catch(console.error);
    }

    this.dom.lessonScene.classList.add('active');
    document.body.style.overflow = 'hidden';

    // Обновляем URL
    if (pushState) {
        const lessonId = encodeURIComponent(lesson.title);
        window.history.pushState({ lessonTitle: lesson.title }, '', `?lesson=${lessonId}`);
    }
},

closeLesson(pushState = true) {
    this.dom.lessonScene.classList.remove('active');
    
    // Очищаем URL
    if (pushState) {
        window.history.pushState({}, '', window.location.pathname);
    }

    setTimeout(() => {
        document.body.style.overflow = '';
        this.dom.lessonContent.innerHTML = ''; 
    }, 300);
},
// Проверка параметров при загрузке
checkURLParams() {
    const params = new URLSearchParams(window.location.search);
    const lessonTitle = params.get('lesson');
    
    if (lessonTitle) {
        const decodedTitle = decodeURIComponent(lessonTitle);
        const lesson = this.data.find(l => l.title === decodedTitle);
        if (lesson) {
            // Небольшая задержка, чтобы данные успели инициализироваться
            setTimeout(() => this.openLesson(lesson, false), 100);
        }
    }
}
};

document.addEventListener('DOMContentLoaded', () => app.init());