var T2S;

if ("speechSynthesis" in window || speechSynthesis) { // Checking If speechSynthesis Is Supported.
    T2S = window.speechSynthesis || speechSynthesis; // Storing speechSynthesis API as variable - T2S
    // To Speak The Utterance
    window.onbeforeunload = function () {
        T2S.cancel(); // To Stop Speaking If the Page Is Closed.
    }
}

document.addEventListener('alpine:init', () => {
    Alpine.data('game', function () {
        return {
            async init() {
                window.app = this;
                if (window.app.game.generatedLetterz === '') {
                    window.app.game.nextGame()
                }
                Alpine.nextTick(() => window.app.animateGame())
                document.querySelector('#photo img').onload = () => window.app.game.imageIsLoading = false;

                if(window.app.triesRemaining<=0){
                    window.app.showModalResult = true;
                    Alpine.nextTick(() => window.app.animateResult())
                }

                window.app.lock = false;
            },
            lock: true,
            currentGameIndex: this.$persist(0),
            game: {
                showAnswer: false,
                state: null,
                userInput: this.$persist(''),
                image: this.$persist(''),
                imageIsLoading: false,
                generatedLetterz: this.$persist(''),
                get correctWord() { return window.app.games?.[window.app.currentGameIndex]?.ar ?? '' },
                insertLetter(letter) {
                    if(window.app.lock)return;
                    if (letter && window.app.game.userInput.length<window.app.game.correctWord.length) {
                        let tmp = window.app.game.userInput+= letter
                        window.app.game.userInput="";
                        Alpine.nextTick(() => window.app.game.userInput = tmp)
                    }
                },
                removeLetter() {
                    if(window.app.lock)return;
                    window.app.game.state = null;
                    window.app.game.userInput = window.app.game.userInput.slice(0, -1);
                },
                submit() {
                    if(window.app.lock)return;
                    if(window.app.game.showAnswer) {
                        window.app.showModalResult = true;
                        Alpine.nextTick(() => window.app.animateResult())
                        return;
                    }
                    if(window.app.game.userInput === window.app.game.correctWord)
                    {
                        window.app.game.state = "correct";
                        window.app.showModalResult = true;
                        Alpine.nextTick(() => window.app.animateResult())
                    }
                    else if(window.app.game.userInput.length >= window.app.game.correctWord.length) {
                        window.app.animateShake('#slots').then(()=>{
                            if(window.app.game.state != "wrong"){
                                window.app.triesRemaining--;
                                window.app.game.state = "wrong";
                                if(window.app.triesRemaining<=0){
                                    window.app.game.showAnswer = true;
                                }
                            }
                        })
                    }
                    else {
                        window.app.game.state = null;
                        window.app.animateShake('#slots>span')
                    }
                },
                nextGame() {
                    if(window.app.lock)return;
                    window.app.showModalResult = false;
                    window.app.lock = true;
                    window.app.game.showAnswer = false;
                    window.app.animateGame(false).then(() => {
                        window.app.game.state = null;
                        window.app.game.userInput = '';
                        window.app.triesRemaining = window.app.triesCount;
                        window.app.currentGameIndex++;
                        if (window.app.currentGameIndex >= window.app.games.length) {
                            window.app.currentGameIndex = 0;
                        }
                        Alpine.nextTick(async () => {
                            window.app.game.generatedLetterz = window.app.generateLetters(window.app.game.correctWord, window.app.lettersCount)
                            window.app.game.imageIsLoading = true;
                            window.app.game.image = await window.app.fetchImage(window.app.games?.[window.app.currentGameIndex]?.en)
                            Alpine.nextTick(() => window.app.animateGame().then(() =>  window.app.lock = false))
                        })
                    })
                },
            },
            animating: false,
            speaking: false,
            showModalSettings: false,
            showModalResult: false,
            //Tools
            readWord(word) {
                var msg = new SpeechSynthesisUtterance()
                msg.lang = 'ar'
                msg.text = word
                msg.onend = (event) => {
                    window.app.speaking = false;
                }
                window.app.speaking = true;
                T2S.speak(msg);
            },
            games: [{ ar: 'ذئب', en: 'wolf' }, { ar: 'برتقال', en: 'orange' }, { ar: 'فأرة', en: 'mice' }],
            //Options
            imageShow: this.$persist(true),
            triesRemaining: this.$persist(0),
            triesCount: this.$persist(3),
            lettersCount: this.$persist(8),
            //Static
            letters: [
                'ى', 'ئ', 'ؤ', 'آ', 'إ', 'أ', 'ء',
                'ض', 'ص', 'ث', 'ق', 'ف', 'غ', 'ع', 'ه', 'خ', 'ح', 'ج',
                'ش', 'س', 'ي', 'ب', 'ل', 'ا', 'ت', 'ن', 'م', 'ك', 'ط',
                'ذ', 'ر', 'ة', 'و', 'ز', 'ظ', 'د',
            ],
            get resultTitle() {
                const percent = window.app.triesRemaining/window.app.triesCount;
                if(percent === 1){
                    return "ممتاز!";
                }
                if(percent >= .8){
                    return "جيد جداً!";
                }
                if(percent >= .6){
                    return "جيد!";
                }
                if(percent >= .4){
                    return "محاولة مقبولة!";
                }
                if(percent >= .2){
                    return "يمكنك تقديم أفضل!";
                }

                return "لم تُوفّق!";
            },
            //Tools
            //API
            async fetchImage(word) {
                let data = await fetch("https://pixabay.com/api/?key=27297690-f114455757e5b498e86889b33&image_type=photo&editors_choice=1&q=" + word);
                data = await data.json()
                let image = data.hits[Math.floor(Math.random() * data.hits.length)].webformatURL
                return image
            },
            //Strings
            shuffle: str => [...str].sort(() => Math.random() - .5).join(''),
            isLetter(str) {
                return str.length === 1 && str.match(/[\u0600-\u06FF]/)?.[0];
            },
            generateLetters(includedLetters, totalLetters) {
                let tmp = includedLetters;
                for (let i = 0, l = totalLetters - tmp.length; i < l; i++) {
                    let rdmL = '';
                    while (rdmL === "" || tmp.includes(rdmL)) {
                        rdmL = window.app.letters[Math.floor(Math.random() * window.app.letters.length)]
                    }
                    tmp += rdmL;
                }
                return window.app.shuffle(tmp)
            },
            //Animations
            animateResult() {
                return new Promise((resolve, reject) => {
                    var tl = anime.timeline();
                    tl.add({
                        targets: '#resultTitle',
                        scale: [0, '100%'],
                        easing: 'easeOutElastic(1, .4)'
                    }).add({
                        targets: '#resultStars>.correct',
                        scale: [0, '100%'],
                        delay: function (el, i, l) {
                            return i * 100;
                        }
                    }, "-=600").add({
                        targets: '#resultStars>.wrong',
                        opacity: [0, '100%'],
                        delay: function (el, i, l) {
                            return i * 100;
                        }
                    }, "-=600").add({
                        targets: '#resultButtons>button',
                        scale: [0, '100%'],
                        delay: function (el, i, l) {
                            return i * 100;
                        },
                    }, "-=600")
                    tl.finished.then(resolve);
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
                            value: xMax/-2,
                          },
                          {
                            value: xMax/2,
                          },
                          {
                            value: 0,
                          }
                        ],
                      })
                    tl.finished.then(resolve);
                })
            },
            animateGame(animateIn=true) {
                return new Promise((resolve, reject) => {
                    document.getElementById('slots').style.transform = null;
                    var tl = anime.timeline({
                        direction: animateIn ? 'normal' : 'reverse',
                    });
                    tl.add({
                        targets: '#photo',
                        scale: [0, '100%'],
                        easing: 'easeOutElastic(1, .4)'
                    })
                    .add({
                        targets: '#letters>button',
                        scale: [0, '100%'],
                        delay: function (el, i, l) {
                            return i * 100;
                        }
                    }, '-=600')
                    .add({
                        targets: animateIn ? '#slots>span' : '#slots',
                        scale: [0, '100%'],
                        delay: function (el, i, l) {
                            return i * 50;
                        },
                    }, '-=1200')
                    .add({
                        targets: '#buttons>button',
                        scale: [0, '100%'],
                        delay: function (el, i, l) {
                            return i * 50;
                        },
                    }, '-=600')
                    tl.finished.then(resolve);
                })
            },
        }
    })
})
