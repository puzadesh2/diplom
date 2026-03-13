(function () {
    // Отключаем восстановление позиции скролла браузером
    if ('scrollRestoration' in history) {
        history.scrollRestoration = 'manual';
    }
    // Прокручиваем к началу
    window.scrollTo(0, 0);

    const linesContainer = document.querySelector(".lines");
    const hint = document.getElementById("hint");
    const img = document.querySelector('.section1-img');

    const poemLines = [
        "У лукоморья дуб зелёный;",
        "Златая цепь на дубе том:",
        "И днём и ночью кот учёный",
        "Всё ходит по цепи кругом;"
    ];

    let currentIndex = 2;          // следующая пара после первых двух
    let animating = false;
    let shiftsDone = 0;            // сколько раз уже сменили пару строк
    const maxShiftsBeforeFreeScroll = 1; // после одной смены пары даём обычный скролл

    function createLine(text) {
        const div = document.createElement("div");
        div.className = "line-item";
        div.textContent = text;
        return div;
    }

    function init() {
        linesContainer.innerHTML = "";
        linesContainer.appendChild(createLine(poemLines[0]));
        linesContainer.appendChild(createLine(poemLines[1]));
    }

    init();

    function shiftLines() {
        if (animating) return;
        animating = true;

        const oldLines = Array.from(linesContainer.children);

        // Уход старых строк вверх
        oldLines.forEach(el => {
            el.classList.remove("enter", "enter-active");
            el.classList.add("leave");
            // запуск анимации
            requestAnimationFrame(() => {
                el.classList.add("leave-active");
            });
        });

        // Через короткое время убираем старые и добавляем новые
        setTimeout(() => {
            linesContainer.innerHTML = "";

            let added = 0;
            while (currentIndex < poemLines.length && added < 2) {
                const newLine = createLine(poemLines[currentIndex]);
                newLine.classList.add("enter");
                linesContainer.appendChild(newLine);

                requestAnimationFrame(() => {
                    newLine.classList.add("enter-active");
                });

                currentIndex++;
                added++;
            }

            if (hint && shiftsDone === 0) {
                hint.classList.add("hidden");
            }

            shiftsDone++;

            img.classList.add('zoomed');

            if (shiftsDone >= maxShiftsBeforeFreeScroll) {
                window.removeEventListener("wheel", handleWheel, { passive: false });
            }

            animating = false;
        }, 350); // быстрый переход, почти без "белого" промежутка
    }

    function handleWheel(e) {
        if (e.deltaY <= 0) return;

        // Блокируем скролл, пока не показали нужные пары строк
        if (shiftsDone < maxShiftsBeforeFreeScroll) {
            e.preventDefault();
            shiftLines();
        }
    }

    window.addEventListener("wheel", handleWheel, { passive: false });
})();