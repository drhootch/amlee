window.addEventListener('resize', () => {
    calcImageSize()
});
function calcImageSize() {
    window.app.game.imageSize = window.innerWidth < 1024 ? document.getElementById('imageContainer')?.clientHeight ?? 0 : 0;
}
var audio = new Audio("../assets/click.mp3");
function playClickAudio() {
    audio.currentTime = 0;
    audio.play()
}
var audioElement = null;
function initAudioElement(audioUrl) {
    document.getElementById('audio').innerHTML = "";
    audioElement = WaveSurfer.create({
        container: '#audio',
        backend: 'MediaElement',
        responsive: true,
        barHeight: 2,
        cursorWidth: 0,
        height: 60,
        progressColor: '#0F766E',
        waveColor: '#00ADA0',
        //barWidth: 2,
        //barGap: 2,
    });

    if (audioUrl) {
        audioElement.load(audioUrl)
    }
    audioElement.on('seek', function () {
        if (!audioElement.played) {
            audioElement.play(0);
            audioElement.played = true;
        }
    })
}
var langDirection = {
    en: 'ltr',
    ar: 'rtl',
}
var languages = {
    ar: {
        amly: 'أملِ',
        appTitle: 'أملِ - المدرّب الإملائي',
        close: 'غلق',
        remove: 'حذف',
        clear: 'مسح',
        submit: 'إدخال',
        settings_lang: 'لغة الواجهة',
        settings_level: 'المستوى',
        settings_level_auto: 'مستوى آلي',
        next_game: 'اللعبة القادمة',
        your_answer: 'إجابتك:',
        the_answer: 'الإجابة الصحيحة:',
        show_details: 'إظهار المزيد',
        details: 'تفاصيل:',
        continue: 'واصل',
        info: 'فائدة:',
        scoreTexts: [
            "لم تُوفّق!",
            "يمكنك تقديم أفضل!",
            "محاولة مقبولة!",
            "جيد!",
            "جيد جداً!",
            "ممتاز!"
        ],
    },
    en: {
        amly: 'Amly',
        appTitle: 'Amly',
        close: 'Close',
        clear: 'Clear',
        remove: 'Remove',
        submit: 'Submit',
        settings_lang: 'Interface language',
        settings_level: 'Level',
        settings_level_auto: 'Automatic level',
        next_game: 'Next game',
        your_answer: 'Your answer',
        the_answer: 'The correct answer',
        show_details: 'Show more',
        details: 'Details',
        continue: 'Continue',
        info: 'Tip',
        scoreTexts: [
            "It was not enough!",
            "You can do better!",
            "Acceptable!",
            "Good!",
            "Very good!",
            "Excellent!"
        ],
    }
}
document.addEventListener('alpine:init', () => {
    Alpine.data('game', function () {
        return {
            async init() {
                window.app = this;


                Alpine.nextTick(() => {
                    window.app.updateInterface();
                    calcImageSize();
                })

                this.$watch('lang', value => {
                    window.app.updateInterface()
                    window.app.game.nextGame();
                })

                if (window.app.game.current === null || (window.app.game.current.type !== 'text_write' && !window.app.game.choices.length)) {
                    Alpine.nextTick(() => window.app.game.nextGame(false))
                }
                else {
                    Alpine.nextTick(() => window.app.animateGame());
                    if (window.app.showModalResult) {
                        window.app.getScore()
                        Alpine.nextTick(() => window.app.animateResult())
                    } else {
                        window.app.lock = false;
                    }
                }
            },
            lang: this.$persist('ar'),
            get i18n() {
                return languages[window.app.lang]
            },
            lock: true,
            showModalAbout: false,
            showModalSettings: false,
            showModalResult: this.$persist(false),
            waitingAnimation: false,
            settings: {
                level: this.$persist(1),
                category: this.$persist('all'),
            },
            game: {
                state: this.$persist(null),
                userInput: this.$persist(''),
                image: this.$persist(null),
                imageIsLoading: true,
                imageSize: 0,
                correct: [],
                choices: this.$persist([]),
                current: this.$persist(null),
                triesRemaining: this.$persist(1),
                get canSubmit() {
                    if (window.app.game.current.type === 'single_choice') {
                        return window.app.game.state !== 'wrong';
                    }
                    else if (window.app.game.current.type === 'text_write' && window.app.game.userInput.length > 0) {
                        return true;
                    }
                    else if (window.app.game.userInput.length >= window.app.game.current.answer.length && window.app.game.state !== 'wrong') {
                        return true;
                    }
                    return false;
                },
                insertLetter(letter) {
                    if (window.app.lock) return;
                    if (window.app.game.current.type === 'single_choice') {
                        window.app.game.state = null;
                        window.app.game.userInput = letter;
                        Alpine.nextTick(() => window.app.game.submit())
                    }
                    else if (letter && window.app.game.current.type === 'text_write') {
                        window.app.game.userInput += letter
                    }
                    else if (letter && window.app.game.userInput.length < window.app.game.current.answer.length) {
                        let tmp = window.app.game.userInput + letter
                        window.app.game.userInput = "";
                        Alpine.nextTick(() => window.app.game.userInput = tmp)
                    }
                },
                removeLetter() {
                    if (window.app.lock) return;
                    window.app.game.state = null;
                    window.app.game.userInput = window.app.game.userInput.slice(0, -1);
                },
                submit() {
                    if (window.app.lock || !window.app.game.userInput) return;
                    window.app.lock = true;
                    if (window.app.removeTashkeel(window.app.game.userInput).replace(/\s+/g, ' ').trim() === window.app.removeTashkeel(window.app.game.current.answer).replace(/\s+/g, ' ').trim()) {
                        window.app.game.state = "correct";
                        window.app.showModalResult = true;
                        window.app.getScore()
                        Alpine.nextTick(() => window.app.animateResult())
                    }
                    else if (window.app.game.current.type === 'single_choice' || window.app.game.current.type === 'text_write' || window.app.game.userInput.length >= window.app.game.current.answer.length) {
                        window.app.animateShake(window.app.game.current.type === 'single_choice' ? '#letters>.selected' : (window.app.game.current.type === 'text_write' ? '#textarea' : '#slots')).then(() => {
                            if (window.app.game.canSubmit && (window.app.game.current.type === 'text_write' || window.app.game.state != "wrong")) {
                                window.app.game.triesRemaining--;
                                window.app.game.state = "wrong";
                                if (window.app.game.triesRemaining <= 0) {
                                    window.app.showModalResult = true;
                                    window.app.getScore()
                                    Alpine.nextTick(() => window.app.animateResult())
                                }
                                else {
                                    window.app.lock = false;
                                }
                            }
                            else {
                                window.app.lock = false;
                            }
                        })
                    }
                    else {
                        window.app.game.state = null;
                        window.app.animateShake('#slots>span')
                        window.app.lock = false;
                    }
                },
                async nextGame(animateOut = true, gameid) {
                    if (window.app.animating) return;
                    window.app.lock = true;
                    window.app.showModalResult = false;
                    window.app.animateGame(false, !animateOut).then(() => {
                        window.app.game.image = null;
                        window.app.game.imageIsLoading = false;
                        window.app.game.state = null;
                        window.app.game.userInput = '';
                        window.app.waitingAnimation = true;
                        window.app.fetchGame(gameid).then(async (newGame) => {
                            window.app.game.current = newGame;
                            Alpine.nextTick(() => initAudioElement(window.app.game.current.audio));
                            window.app.game.choices = window.app.game.current.type === 'text_write' ? [] : window.app.game.current.choices ? window.app.shuffle(window.app.game.current.choices) : window.app.generateLetters(window.app.game.current.answer, window.app.game.current.numberOfLetters ?? window.app.lettersCount)
                            window.app.game.imageIsLoading = true;
                            window.app.game.triesRemaining = window.app.game.current.attempts;
                            let tmp_img = window.app.game.image;
                            if (window.app.game.current.imgTag?.length) {
                                window.app.game.image = await window.app.fetchImage(window.app.game.current.imgTag);
                            }
                            else {
                                window.app.game.image = window.app.game.current.img?.length ? window.app.game.current.img : null;
                            }
                            if (tmp_img === window.app.game.image) window.app.game.imageIsLoading = false;

                            Alpine.nextTick(() => {
                                setTimeout(() => {
                                    calcImageSize();
                                }, 100);
                                window.app.animateGame().then(() => window.app.lock = false)
                            })
                        })
                    })
                },
            },
            //Tools
            readWord(word) {
                if (audioElement.isReady) {
                    audioElement.playPause();
                }
                else if (responsiveVoice) {
                    responsiveVoice.speak(word, "Arabic Male");
                }
            },
            //Static
            letters: [
                'ى', 'ئ', 'ؤ', 'آ', 'إ', 'أ', 'ء',
                'ض', 'ص', 'ث', 'ق', 'ف', 'غ', 'ع', 'ه', 'خ', 'ح', 'ج',
                'ش', 'س', 'ي', 'ب', 'ل', 'ا', 'ت', 'ن', 'م', 'ك', 'ط',
                'ذ', 'ر', 'ة', 'و', 'ز', 'ظ', 'د',
            ],
            remarks: [],
            score: 0,
            level: this.$persist(2),
            leveling: this.$persist(0),
            playedGames: this.$persist([]),
            maxPlayedGames: this.$persist(100),
            showResultDetails: false,
            getScore() {
                window.app.showResultDetails = false;
                remarksArray = [];
                window.app.game.correct = correct(window.app.game.userInput, window.app.game.current?.answer, window.app.game.current?.gameclass);
                window.app.score = getScore(window.app.game.current?.answer, window.app.game.userInput, window.app.game.gameclass);
                window.app.remarks = remarksArray;
                Alpine.nextTick(() => {
                    const elemsSpan = Array.from(document.querySelectorAll("#answser_detail>span"));
                    elemsSpan.forEach((elem, index) => {
                        elem.style.background = "unset";
                    });
                    const elems = Array.from(document.getElementsByClassName("tooltip"));
                    elems.forEach((elem, index) => {
                        elem.removeAttribute("style");
                        elem.classList.add("bg-gray-100", "rounded-md", "cursor-pointer", "p-1", "m-1", "shadow-[0px_0px_4px_rgba(138,138,138,1)]", "text-red-600");
                    });
                    const tltp = new jBox('Tooltip', {
                        attach: '.tooltip',
                        addClass: 'text-xl'
                    });
                    setTimeout(() => {
                        document.getElementById("result-modal").scrollTop = 0;
                    }, 100);
                })
            },
            //Tools
            //API
            fetchGame(gameid) {
                return new Promise(async (resolve, reject) => {
                    try {
                        var url = new URL("https://amly.nbyl.me/server.php");
                        url.searchParams.append("getGame", true);
                        url.searchParams.append("level", window.app.level);
                        url.searchParams.append("lang", window.app.lang);
                        if (!isNaN(gameid)) {
                            url.searchParams.append("gameid", gameid);
                        }
                        let data = await fetch(url);
                        data = await data.json()
                        resolve(data);
                    }
                    catch (error) {
                        reject(error);
                    }
                })
            },
            async fetchImage(word) {
                let data = await fetch("https://pixabay.com/api/?key=27297690-f114455757e5b498e86889b33&image_type=photo&editors_choice=1&q=" + word);
                data = await data.json()
                let rand = Math.floor(Math.random() * data.hits.length);
                let image = data.hits[rand]?.webformatURL
                return image
            },
            //Strings
            shuffle(array) {
                let currentIndex = array.length, randomIndex;
                while (currentIndex != 0) {
                    randomIndex = Math.floor(Math.random() * currentIndex);
                    currentIndex--;
                    [array[currentIndex], array[randomIndex]] = [
                        array[randomIndex], array[currentIndex]];
                }
                return array;
            },
            isLetter(str) {
                if (window.app.game.current.type === 'text_write' && (str.length === 1 && str.match(/[\u0600-\u06FF]/)?.[0] || str === ' ') || (window.app.game.choices.length && window.app.game.choices.includes(str))) return str;
                return false;
            },
            generateLetters(includedLetters, totalLetters) {
                let tmp = includedLetters.split('');
                for (let i = 0, l = totalLetters - tmp.length; i < l; i++) {
                    let rdmL = '';
                    while (rdmL === "" || tmp.includes(rdmL)) {
                        rdmL = window.app.letters[Math.floor(Math.random() * window.app.letters.length)]
                    }
                    tmp.push(rdmL);
                }
                return window.app.shuffle(tmp)
            },
            removeTashkeel(text) {
                return text.replace(/([^\u0621-\u063A\u0641-\u064A\u0660-\u0669a-zA-Z 0-9])/g, '');
            },
            keypressed(e) {
                if (e.altKey) {
                    if (e.code === "KeyA") {
                        window.app.game.nextGame(true, 6);
                    }
                    else if (e.code === "KeyS") {
                        window.app.game.nextGame(true, 4);
                    }
                    else if (e.code === "KeyD") {
                        window.app.game.nextGame(true, 0);
                    }
                    else if (e.code === "KeyF") {
                        window.app.game.nextGame(true, 1);
                    }
                    else if (e.code === "KeyG") {
                        window.app.game.nextGame(true, 7);
                    }
                    else if (e.code === "KeyH") {
                        window.app.game.nextGame(true, 3);
                    }
                    else if (e.code === "KeyJ") {
                        window.app.game.nextGame(true, 2);
                    }
                    else if (e.code === "KeyK") {
                        window.app.game.nextGame(true, 10);
                    }
                    else if (e.code === "KeyL") {
                        window.app.game.nextGame(true, 9);
                    }
                    else if (e.code === "KeyZ") {
                        window.app.game.nextGame(true, 8);
                    }
                    else if (e.code === "KeyX") {
                        window.app.game.nextGame(true, 5);
                    }
                    else if (e.code === "KeyN") {
                        window.app.game.nextGame();
                    }
                    else if (e.code === "KeyP") {
                        //play/pause
                        audioElement.playPause();
                    }
                }
            },
            //Animations
            animateResult() {
                return new Promise((resolve, reject) => {
                    window.app.animating = true;
                    var tl = anime.timeline({
                        duration: 800
                    });
                    tl.add({
                        targets: '#resultTitle',
                        scale: [0, 1],
                        easing: 'easeOutElastic(1, .4)'
                    }).add({
                        targets: '#resultStars>.correct',
                        scale: [0, 1],
                        delay: function (el, i, l) {
                            return i * 100;
                        }
                    }, "-=600")

                    if (window.app.score < 100) {
                        tl.add({
                            targets: '#answer',
                            opacity: [0, 1],
                            delay: function (el, i, l) {
                                return i * 100;
                            },
                        })
                    }
                    tl.add({
                        targets: '#resultStars>.wrong',
                        opacity: [0, 1],
                        delay: function (el, i, l) {
                            return i * 100;
                        }
                    }, "-=600").add({
                        targets: '#resultButtons>button',
                        scale: [0, 1],
                        delay: function (el, i, l) {
                            return i * 100;
                        },
                    }, "-=600");
                    tl.finished.then(() => {
                        window.app.animating = false;
                        resolve()
                    });
                })
            },
            animateShake(targets) {
                return new Promise((resolve, reject) => {
                    const xMax = 16;
                    var tl = anime.timeline();
                    tl.add({
                        targets: targets,
                        easing: 'easeInOutSine',
                        duration: 550,
                        translateX: [
                            {
                                value: xMax * -1,
                            },
                            {
                                value: xMax,
                            },
                            {
                                value: xMax / -2,
                            },
                            {
                                value: xMax / 2,
                            },
                            {
                                value: 0,
                            }
                        ],
                    })
                    tl.finished.then(resolve);
                })
            },
            animateGame(animateIn = true, earlyReturn) {
                return new Promise((resolve, reject) => {
                    if (earlyReturn) {
                        resolve();
                        return;
                    }
                    if (document.getElementById('slots'))
                        document.getElementById('slots').style.transform = null;
                    window.app.waitingAnimation = false;
                    window.app.animating = true;
                    var tl = anime.timeline({
                        direction: animateIn ? 'normal' : 'reverse',
                        duration: 800
                    });
                    tl
                        .add({
                            targets: '#gameBoard',
                            opacity: [0, 1],
                            easing: 'spring(1, 80, 10, 0)',
                        })
                        .add({
                            targets: '#title',
                            scale: [0, 1],
                            easing: 'easeOutElastic(.7, .4)',
                        }, '-=1000')
                        .add({
                            targets: '#triesHearts>svg',
                            scale: [0, 1],
                            delay: function (el, i, l) {
                                return i * 100;
                            }
                        }, '-=900')
                        .add({
                            targets: '#photo',
                            scale: [0, 1],
                            easing: 'easeOutElastic(.7, .4)',
                        }, '-=600')
                        .add({
                            targets: '#question',
                            scale: [0, 1],
                            easing: 'easeOutElastic(.7, .4)',
                        }, '-=600')
                        .add({
                            targets: '#letters>button',
                            scale: [0, 1],
                            easing: 'easeOutElastic(.7, .4)',
                            delay: function (el, i, l) {
                                return i * 100;
                            }
                        }, '-=600')
                    if (window.app.game.current?.type === 'word_building') {
                        tl.add({
                            targets: animateIn ? '#slots>span' : '#slots',
                            scale: [0, 1],
                            delay: function (el, i, l) {
                                return i * 50;
                            },
                        }, '-=1200')
                    }
                    else if (window.app.game.current?.type === 'text_write') {
                        tl.add({
                            targets: '#textarea',
                            scale: [0, 1],
                            easing: 'easeOutElastic(.7, .4)',
                            delay: function (el, i, l) {
                                return i * 50;
                            },
                        }, '-=1200')
                    }
                    tl.add({
                        targets: '#buttons>button',
                        scale: [0, 1],
                        easing: 'easeOutElastic(.7, .4)',
                        delay: function (el, i, l) {
                            return i * 50;
                        },
                    }, '-=600')
                    tl.finished.then(() => {
                        window.app.animating = false;
                        resolve()
                    });
                })
            },
            updateInterface() {
                document.documentElement.setAttribute('dir', langDirection[window.app.lang])
                document.querySelector('title').innerHTML = window.app.i18n.appTitle
                var changes = [
                    {
                        from: langDirection[window.app.lang] === "ltr" ? "text-right" : "text-left",
                        to: langDirection[window.app.lang] === "ltr" ? "text-left" : "text-right",
                    },
                    {
                        from: langDirection[window.app.lang] === "ltr" ? "lg:text-right" : "lg:text-left",
                        to: langDirection[window.app.lang] === "ltr" ? "lg:text-left" : "lg:text-right",
                    },
                    {
                        from: langDirection[window.app.lang] === "ltr" ? "space-x-reverse" : "space-x",
                        to: langDirection[window.app.lang] === "ltr" ? "space-x" : "space-x-reverse",
                    },
                    {
                        from: langDirection[window.app.lang] === "ltr" ? "lg:space-x-reverse" : "lg:space-x",
                        to: langDirection[window.app.lang] === "ltr" ? "lg:space-x" : "lg:space-x-reverse",
                    },
                ]
                changes.forEach((change, index) => {
                    const elems = Array.from(document.getElementsByClassName(change.from));
                    elems.forEach((elem, index) => {
                        elem.classList.remove(change.from);
                        elem.classList.add(change.to);
                    });
                });
            }
        }
    })
})
