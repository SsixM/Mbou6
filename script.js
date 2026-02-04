const app = {
    data: [],
    state: {
        filter: 'all',
        search: '',
        sort: 'newest'
    },
    initData() {
        // Берем данные напрямую из переменной lessons, которая загрузилась из lessons.js
        if (typeof lessons !== 'undefined') {
            this.data = lessons;
            
            // Если нужно - искусственная задержка для красоты лоадера (можно убрать)
            setTimeout(() => {
                this.dom.loader.style.display = 'none';
                this.generateFilters();
                this.render();
            }, 500); 
        } else {
            this.dom.loader.style.display = 'none';
            this.dom.error.textContent = 'Ошибка: файл lessons.js не найден или поврежден';
            this.dom.error.style.display = 'block';
        }
    },

    // Не забудь в методе init() заменить вызов fetchData() на initData()
    init() {
        this.cacheDOM();
        this.bindEvents();
        this.initData(); // <-- Изменено
    },

    cacheDOM() {
        this.dom = {
            grid: document.getElementById('lesson-grid'),
            loader: document.getElementById('loader'),
            error: document.getElementById('error-msg'),
            searchInput: document.getElementById('search-input'),
            filtersContainer: document.getElementById('filters-container'),
            sortSelect: document.getElementById('sort-select'),
            homeScene: document.getElementById('scene-home'),
            lessonScene: document.getElementById('scene-lesson'),
            lessonContent: document.getElementById('lesson-content'),
            lessonSubject: document.getElementById('lesson-subject-badge'),
            lessonDate: document.getElementById('lesson-date-display')
        };
    },

    bindEvents() {
        this.dom.searchInput.addEventListener('input', (e) => {
            this.state.search = e.target.value.toLowerCase();
            this.render();
        });

        this.dom.sortSelect.addEventListener('change', (e) => {
            this.state.sort = e.target.value;
            this.render();
        });

        // Делегирование событий для кнопок фильтров
        this.dom.filtersContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('chip')) {
                this.setFilter(e.target.dataset.filter);
                
                // Обновление UI кнопок
                document.querySelectorAll('.chip').forEach(btn => btn.classList.remove('active'));
                e.target.classList.add('active');
            }
        });
    },

    generateFilters() {
        const subjects = [...new Set(this.data.map(item => item.subject))];
        subjects.sort();
        
        subjects.forEach(subject => {
            const btn = document.createElement('button');
            btn.className = 'chip';
            btn.textContent = subject;
            btn.dataset.filter = subject;
            this.dom.filtersContainer.appendChild(btn);
        });
    },

    setFilter(filterType) {
        this.state.filter = filterType;
        this.render();
    },

    getSubjectColor(subject) {
        const map = {
            'Алгебра': 'var(--color-math)',
            'Геометрия': 'var(--color-math)',
            'История': 'var(--color-history)',
            'Биология': 'var(--color-bio)',
            'Физика': 'var(--color-phys)'
        };
        return map[subject] || 'var(--color-default)';
    },

    render() {
        let filtered = this.data.filter(item => {
            // Поиск по заголовку, предмету и СОДЕРЖИМОМУ
            const contentMatch = (
                item.title.toLowerCase().includes(this.state.search) ||
                item.subject.toLowerCase().includes(this.state.search) ||
                item.content.toLowerCase().includes(this.state.search)
            );

            // Фильтрация по тегам
            const tagMatch = this.state.filter === 'all' || item.subject === this.state.filter;

            return contentMatch && tagMatch;
        });

        // Сортировка
        filtered.sort((a, b) => {
            const dateA = new Date(a.date);
            const dateB = new Date(b.date);
            return this.state.sort === 'newest' ? dateB - dateA : dateA - dateB;
        });

        // Рендер Grid
        this.dom.grid.innerHTML = '';
        if (filtered.length === 0) {
            this.dom.grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: var(--text-secondary);">Ничего не найдено</div>';
            return;
        }

        filtered.forEach(lesson => {
            const card = document.createElement('div');
            card.className = 'card';
            const color = this.getSubjectColor(lesson.subject);
            card.style.setProperty('--item-color', color);
            
            // Форматирование даты
            const dateObj = new Date(lesson.date);
            const dateStr = dateObj.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });

            card.innerHTML = `
                <div class="card-top">
                    <span class="card-badge">${lesson.subject}</span>
                    <div class="card-title">${lesson.title}</div>
                </div>
                <div class="card-footer">
                    <span>${dateStr}</span>
                    <span>Читать →</span>
                </div>
            `;
            
            card.onclick = () => this.openLesson(lesson);
            this.dom.grid.appendChild(card);
        });
    },

    openLesson(lesson) {
        // Рендер контента
        this.dom.lessonContent.innerHTML = marked.parse(lesson.content);
        
        // Метаданные
        this.dom.lessonSubject.textContent = lesson.subject;
        this.dom.lessonSubject.style.color = this.getSubjectColor(lesson.subject);
        this.dom.lessonDate.textContent = new Date(lesson.date).toLocaleDateString('ru-RU', { 
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
        });

        // MathJax
        if (window.MathJax && window.MathJax.typesetPromise) {
            MathJax.typesetPromise([this.dom.lessonContent]).catch(err => console.log(err));
        }

        // Анимация открытия
        this.dom.lessonScene.style.display = 'block';
        document.body.style.overflow = 'hidden'; // Блокировка прокрутки фона
        
        // Небольшая задержка для CSS transition
        setTimeout(() => {
            this.dom.lessonScene.style.opacity = '1';
        }, 10);
    },

    closeLesson() {
        this.dom.lessonScene.style.opacity = '0';
        setTimeout(() => {
            this.dom.lessonScene.style.display = 'none';
            document.body.style.overflow = '';
        }, 300);
    }
};

// Запуск
document.addEventListener('DOMContentLoaded', () => app.init());