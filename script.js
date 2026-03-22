(function () {
    // Отключаем восстановление позиции скролла браузером
    if ('scrollRestoration' in history) {
        history.scrollRestoration = 'manual';
    }
    // Прокручиваем к началу
    window.scrollTo(0, 0);

    const linesContainer = document.querySelector(".lines");
    const linesContainerBox = linesContainer && linesContainer.closest(".lines-container");
    const hint = document.getElementById("hint");
    const img = document.querySelector('.page > .wrapper:first-child .photo');

    /** Подбирает font-size на .lines-container так, чтобы обе строки стиха помещались в одну линию каждая (всего 2 строки). */
    function fitTwoLinesFont() {
        if (!linesContainerBox) return;
        const items = linesContainerBox.querySelectorAll(".line-item");
        if (!items.length) return;

        linesContainerBox.style.fontSize = "";
        const maxPx = parseFloat(getComputedStyle(linesContainerBox).fontSize) || 31;

        function fits(px) {
            linesContainerBox.style.fontSize = px + "px";
            for (let i = 0; i < items.length; i++) {
                if (items[i].scrollWidth > items[i].clientWidth + 0.5) return false;
            }
            return true;
        }

        if (fits(maxPx)) {
            linesContainerBox.style.fontSize = maxPx + "px";
            return;
        }

        let lo = 6;
        let hi = maxPx;
        while (hi - lo > 0.25) {
            const mid = (lo + hi) / 2;
            if (fits(mid)) lo = mid;
            else hi = mid;
        }
        linesContainerBox.style.fontSize = lo + "px";
    }

    function scheduleFitTwoLinesFont() {
        requestAnimationFrame(() => requestAnimationFrame(fitTwoLinesFont));
    }

    let resizeFitTimer;
    window.addEventListener("resize", () => {
        clearTimeout(resizeFitTimer);
        resizeFitTimer = setTimeout(scheduleFitTwoLinesFont, 100);
    });

    if (linesContainerBox && typeof ResizeObserver !== "undefined") {
        new ResizeObserver(() => scheduleFitTwoLinesFont()).observe(linesContainerBox);
    }

    if (img) {
        const enablePanTransition = () => img.classList.add('photo-pan-interactive');
        if (img.complete) {
            requestAnimationFrame(() => requestAnimationFrame(enablePanTransition));
        } else {
            img.addEventListener('load', () => {
                requestAnimationFrame(() => requestAnimationFrame(enablePanTransition));
            }, { once: true });
        }
    }

    const poemLines = [
        "У лукоморья дуб зелёный;",
        "Златая цепь на дубе том:",
        "И днём и ночью кот учёный",
        "Всё ходит по цепи кругом;",
        "Идёт направо — песнь заводит,",
        "Налево — сказку говорит.",
        "Там чудеса: там леший бродит,",
        "Русалка на ветвях сидит;"
    ];

    /* [0,1] → скролл1: [2,3]+zoom → скролл2: [4,5] → скролл3: пан влево + [6,7]; после 3-го шага снимается wheel */
    let currentIndex = 2;
    let animating = false;
    let shiftsDone = 0;

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

    if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(scheduleFitTwoLinesFont);
    } else {
        scheduleFitTwoLinesFont();
    }

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
            const newLines = [];
            while (currentIndex < poemLines.length && added < 2) {
                const newLine = createLine(poemLines[currentIndex]);
                newLine.classList.add("enter");
                linesContainer.appendChild(newLine);
                newLines.push(newLine);

                currentIndex++;
                added++;
            }

            setTimeout(() => {
                newLines.forEach(el => el.classList.add("enter-active"));
                scheduleFitTwoLinesFont();
            }, 50);

            if (hint && shiftsDone === 0) {
                hint.classList.add("hidden");
            }

            shiftsDone++;

            if (shiftsDone === 1 && img) {
                img.classList.add('zoomed');
            }

            /* Не снимать на shiftsDone === 2: на этих строках ещё нужен третий скролл (панорама влево + [6,7]) */
            if (shiftsDone >= 3) {
                window.removeEventListener("wheel", handleWheel, { passive: false });
            }

            animating = false;
        }, 350); // быстрый переход, почти без "белого" промежутка
    }

    function handleWheel(e) {
        if (e.deltaY <= 0) return;
        if (shiftsDone >= 3) return;

        e.preventDefault();

        if (shiftsDone === 0) {
            shiftLines();
            return;
        }
        if (shiftsDone === 1) {
            shiftLines();
            return;
        }
        if (shiftsDone === 2) {
            if (img) img.classList.add('photo-pan-shift');
            shiftLines();
        }
    }

    window.addEventListener("wheel", handleWheel, { passive: false });
})();

// Smooth section snapping with JS
(function() {
    let isScrolling = false;
    let scrollTimeout;

    // Custom smooth scroll function
    function smoothScrollTo(targetY, duration = 2000) {
        const startY = window.scrollY;
        const distance = targetY - startY;
        const startTime = performance.now();

        function animation(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easeInOut = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;
            window.scrollTo(0, startY + distance * easeInOut);

            if (progress < 1) {
                requestAnimationFrame(animation);
            }
        }

        requestAnimationFrame(animation);
    }

    window.addEventListener('scroll', () => {
        if (isScrolling) return;

        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
            const sections = document.querySelectorAll('.section');
            const scrollY = window.scrollY + window.innerHeight / 1.6; // center of viewport

            sections.forEach(section => {
                const sectionTop = section.offsetTop;
                const sectionBottom = sectionTop + section.offsetHeight;

                if (scrollY >= sectionTop && scrollY < sectionBottom) {
                    isScrolling = true;
                    smoothScrollTo(sectionTop, 500); // 2.5 seconds
                    setTimeout(() => isScrolling = false, 3000); // allow more time
                }
            });
        }, 100); // debounce
    });
})();
