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
        // Неоновые цвета
        const map = {
            'Алгебра': '#3b82f6',
            'Геометрия': '#06b6d4',
            'История': '#f59e0b',
            'Биология': '#10b981',
            'Физика': '#8b5cf6',
            'Химия': '#ec4899',
            'Информатика': '#6366f1'
        };
        return map[subject] || '#a8a29e';
    },

    render() {
        // ЛОГИКА ПОИСКА (включая дату!)
        let processedData = this.data.filter(item => {
            // Форматируем дату в строку "dd.mm.yyyy" для поиска
            const dateObj = new Date(item.date);
            const dateStrRu = dateObj.toLocaleDateString('ru-RU'); // 02.02.2026
            const dateStrFull = dateObj.toLocaleDateString('ru-RU', { month: 'long' }).toLowerCase(); // ...февраля...

            const matchesSearch = (
                item.title.toLowerCase().includes(this.state.search) ||
                item.subject.toLowerCase().includes(this.state.search) ||
                item.content.toLowerCase().includes(this.state.search) ||
                dateStrRu.includes(this.state.search) || // Ищем "02.02"
                dateStrFull.includes(this.state.search)  // Ищем "февраль"
            );

            const matchesFilter = this.state.filter === 'all' || item.subject === this.state.filter;
            return matchesSearch && matchesFilter;
        });

        // Сортировка
        processedData.sort((a, b) => {
            const d1 = new Date(a.date);
            const d2 = new Date(b.date);
            return this.state.sort === 'newest' ? d2 - d1 : d1 - d2;
        });

        // Пагинация
        const totalItems = processedData.length;
        const totalPages = Math.ceil(totalItems / this.state.itemsPerPage);
        
        if (this.state.currentPage > totalPages) this.state.currentPage = totalPages || 1;
        if (this.state.currentPage < 1) this.state.currentPage = 1;

        const start = (this.state.currentPage - 1) * this.state.itemsPerPage;
        const pageData = processedData.slice(start, start + this.state.itemsPerPage);

        // Рендер
        this.dom.grid.innerHTML = '';
        
        if (totalItems === 0) {
            this.dom.grid.innerHTML = `<div class="empty-placeholder">Ничего не найдено 👻</div>`;
            this.dom.pagination.style.display = 'none';
            return;
        }

        pageData.forEach((lesson, index) => {
            const card = document.createElement('div');
            card.className = 'card';
            // Stagger animation: задержка появления для каждого следующего элемента
            card.style.animationDelay = `${index * 50}ms`; 
            
            const color = this.getSubjectColor(lesson.subject);
            const dateStr = new Date(lesson.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });

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
            this.dom.grid.appendChild(card);
        });

        // Контролы пагинации
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