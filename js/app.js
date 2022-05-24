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
                if (window.app.game.current.type!=='text_write' && !window.app.game.choices.length) {
                    window.app.game.nextGame()
                }
                Alpine.nextTick(() => window.app.animateGame())
                document.querySelector('#photo>img').onload = () => window.app.game.imageIsLoading = false;

                if(window.app.triesRemaining<=0){
                    window.app.showModalResult = true;
                    Alpine.nextTick(() => window.app.animateResult())
                }

                window.app.lock = false;
            },
            lock: true,
            currentGameIndex: this.$persist(0),
            game: {
                showAnswer: this.$persist(true),
                state: null,
                userInput: this.$persist(''),
                image: this.$persist(''),
                imageIsLoading: false,
                choices: this.$persist([]),
                get current() { return window.app.games?.[window.app.currentGameIndex]; },
                get canSubmit() {
                    if (window.app.game.current.type === 'single_choice') {
                        return window.app.game.state!=='wrong';
                    }
                    else if(window.app.game.current.type==='text_write' && window.app.game.userInput.length>0) {
                        return true;
                    }
                    else if(window.app.game.userInput.length>=window.app.game.current.answer.length && window.app.game.state!=='wrong') {
                        return true;
                    }
                    return false;
                },
                insertLetter(letter) {
                    if(window.app.lock)return;
                    if (window.app.game.current.type === 'single_choice'){
                        window.app.game.state = null;
                        window.app.game.userInput = letter;
                    }
                    else if(letter && window.app.game.current.type==='text_write') {
                        window.app.game.userInput+= letter
                    }
                    else if(letter && window.app.game.userInput.length<window.app.game.current.answer.length) {
                        let tmp = window.app.game.userInput+letter
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
                    if(window.app.removeTashkeel(window.app.game.userInput).replace(/\s+/g, ' ').trim() === window.app.removeTashkeel(window.app.game.current.answer).replace(/\s+/g, ' ').trim())
                    {
                        window.app.game.state = "correct";
                        window.app.showModalResult = true;
                        Alpine.nextTick(() => window.app.animateResult())
                    }
                    else if(window.app.game.current.type === 'single_choice' || window.app.game.current.type === 'text_write' || window.app.game.userInput.length >= window.app.game.current.answer.length) {
                        window.app.animateShake(window.app.game.current.type === 'single_choice' ? '#letters>.selected' : (window.app.game.current.type === 'text_write' ? '#textarea' : '#slots')).then(()=>{
                            if(window.app.game.current.type === 'text_write' || window.app.game.state != "wrong"){
                                window.app.triesRemaining--;
                                window.app.game.state = "wrong";
                                if(window.app.triesRemaining<=0){
                                    window.app.game.showAnswer = true;
                                    window.app.showModalResult = true;
                                    Alpine.nextTick(() => window.app.animateResult())
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
                    window.app.animateGame(false).then(() => {
                        window.app.game.showAnswer = false;
                        window.app.game.state = null;
                        window.app.game.userInput = '';
                        window.app.triesRemaining = window.app.triesCount;
                        window.app.currentGameIndex++;
                        if (window.app.currentGameIndex >= window.app.games.length) {
                            window.app.currentGameIndex = 0;
                        }
                        Alpine.nextTick(async () => {
                            window.app.game.choices = window.app.game.current.type==='text_write' ? [] : window.app.game.current.choices ? window.app.shuffle(window.app.game.current.choices) : window.app.generateLetters(window.app.game.current.answer, window.app.game.current.numberOfLetters ?? window.app.lettersCount)
                            window.app.game.imageIsLoading = true;
                            let tmp_img = window.app.game.image;

                            if(window.app.game.current.imageTag) {
                                window.app.game.image = await window.app.fetchImage(window.app.game.current.imageTag)
                            }
                            if(tmp_img === window.app.game.image) window.app.game.imageIsLoading = false;
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
            games: [
                { type: 'text_write', q: 'استمع واكتب', answer: 'تَعَلَّقَ يَتَعَلَّق', imageTag: 'hanging', get audio() { return this.answer } },
                { type: 'text_write', q: 'استمع واكتب', answer: 'عَالِم عُلَمَاء', imageTag: 'scientist', get audio() { return this.answer } },
                { type: 'single_choice', q: 'اختر الإجابة الصحيحة', q2: 'ما هي عاصمة مصر؟', answer: 'القاهرة', choices: ['القاهرة', 'الجزائر', 'برشلونة', 'بغداد'], imageTag: 'egypt', get audio() { return this.q2 } },
                { type: 'single_choice', q: 'اختر الإجابة الصحيحة', q2: 'ما هو مجموع 1+1 ؟', answer: '2', choices: ['2', '3', '4', '5'], imageTag: '1+1', get audio() { return this.q2 } },
                { type: 'word_building', q: 'استمع واكتب', answer: 'ذئب', numberOfLetters: 8, imageTag: 'wolf', get audio() { return this.answer }  },
                { type: 'word_building', q: 'استمع واكتب', answer: 'برتقال', imageTag: 'orange fruit', get audio() { return this.answer } },
            ],
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
            shuffle(array) {
                let currentIndex = array.length,  randomIndex;
                while (currentIndex != 0) {
                  randomIndex = Math.floor(Math.random() * currentIndex);
                  currentIndex--;
                  [array[currentIndex], array[randomIndex]] = [
                    array[randomIndex], array[currentIndex]];
                }
                return array;
            },
            isLetter(str) {
                if(window.app.game.current.type==='text_write' && (str.length === 1 && str.match(/[\u0600-\u06FF]/)?.[0] || str === ' ') || (window.app.game.choices.length && window.app.game.choices.includes(str))) return str;
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
                    }, "-=600")

                    if(window.app.game.showAnswer) {
                        tl.add({
                            targets: '#answer',
                            opacity: [0, '100%'],
                            delay: function (el, i, l) {
                                return i * 100;
                            },
                        })
                    }
                    tl.add({
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
                    if(document.getElementById('slots'))
                    document.getElementById('slots').style.transform = null;
                    var tl = anime.timeline({
                        direction: animateIn ? 'normal' : 'reverse',
                    });
                    tl
                    .add({
                        targets: '#title',
                        scale: [0, '100%'],
                        easing: 'easeOutElastic(1, .4)'
                    })
                    .add({
                        targets: '#triesHearts>svg',
                        scale: [0, '100%'],
                        delay: function (el, i, l) {
                            return i * 100;
                        }
                    }, '-=900')
                    .add({
                        targets: '#photo',
                        scale: [0, '100%'],
                        easing: 'easeOutElastic(1, .4)'
                    }, '-=600')
                    .add({
                        targets: '#question',
                        scale: [0, '100%'],
                        easing: 'easeOutElastic(1, .4)'
                    }, '-=600')
                    .add({
                        targets: '#letters>button',
                        scale: [0, '100%'],
                        delay: function (el, i, l) {
                            return i * 100;
                        }
                    }, '-=600')
                    if(window.app.game.current.type === 'word_building'){
                        tl.add({
                            targets: animateIn ? '#slots>span' : '#slots',
                            scale: [0, '100%'],
                            delay: function (el, i, l) {
                                return i * 50;
                            },
                        }, '-=1200')
                    }
                    else if(window.app.game.current.type === 'text_write') {
                        tl.add({
                            targets: '#textarea',
                            scale: [0, '100%'],
                            delay: function (el, i, l) {
                                return i * 50;
                            },
                        }, '-=1200')
                    }

                    tl.add({
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
