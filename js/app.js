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
                if (this.generatedLetters === '') {
                    this.nextWordClicked()
                }
                Alpine.nextTick(() => this.animateGame())
                document.querySelector('#photo img').onload = () => this.loadingImage = false;

                if(this.triesRemaining<=0){
                    this.modalResult = true;
                    Alpine.nextTick(() => this.animateResult())
                }

                this.lock = false;
            },
            lock: true,
            currentWordIndex: this.$persist(0),
            get correctWord() { return this.answers?.[this.currentWordIndex]?.ar ?? '' },
            currentImage: this.$persist(''),
            currentTry: this.$persist(''),
            generatedLetters: this.$persist(''),
            generateLetters() {
                let tmp = this.correctWord;
                for (let i = 0, l = this.lettersCount - tmp.length; i < l; i++) {
                    let rdmL = '';
                    while (rdmL === "" || tmp.includes(rdmL)) {
                        rdmL = this.letters[Math.floor(Math.random() * this.letters.length)]
                    }
                    tmp += rdmL;
                }
                this.generatedLetters = this.shuffle(tmp)
            },
            getLetterState(letter) {
                if(this.triesCount>0)return "";
                return this.correctWord.includes(letter) && this.currentTry.includes(letter) ? "correct" : (
                    this.currentTry.includes(letter) ? "wrong" : ""
                );
            },
            insertLetter(letter) {
                if(this.lock)return;
                if (letter && this.currentTry.length<this.correctWord.length) {
                    let tmp = this.currentTry+= letter
                    this.currentTry="";
                    Alpine.nextTick(() => this.currentTry = tmp)
                }
            },
            removeLetter() {
                if(this.lock)return;
                this.state = null;
                this.currentTry = this.currentTry.slice(0, -1);
            },
            enterWord() {
                if(this.lock)return;
                if(this.currentTry === this.correctWord)
                {
                    this.state = "correct";
                    this.modalResult = true;
                    Alpine.nextTick(() => this.animateResult())
                }
                else if(this.currentTry.length >= this.correctWord.length) {
                    this.animateShake('#slots').then(()=>{
                        if(this.state != "wrong"){
                            this.triesRemaining--;
                            this.state = "wrong";
                            if(this.triesRemaining<=0){
                                this.modalResult = true;
                                Alpine.nextTick(() => this.animateResult())
                            }
                        }
                    })
                }
                else {
                    this.state = null;
                    this.animateShake('#slots>span')
                }
            },
            nextWordClicked() {
                if(this.lock)return;

                this.modalResult = false;
                this.lock = true;
                this.animateGame(false).then(() => {
                    this.state = null;
                    this.currentTry = '';
                    this.triesRemaining = this.triesCount;
                    this.currentWordIndex++;
                    if (this.currentWordIndex >= this.answers.length) {
                        this.currentWordIndex = 0;
                    }
                    Alpine.nextTick(() => {
                        this.generateLetters()
                        Alpine.nextTick(() => {
                            this.generateImage()
                            Alpine.nextTick(() => this.animateGame().then(() => this.lock = false))
                        })
                    })
                })
            },
            animating: false,
            speaking: false,
            readWord() {
                var msg = new SpeechSynthesisUtterance()
                msg.lang = 'ar'
                msg.text = this.correctWord
                msg.onend = (event) => {
                    this.speaking = false;
                }
                this.speaking = true;
                T2S.speak(msg);
            },
            openModalSettings: false,
            state: null,
            modalResult: false,
            get openModal() {
                return (this.state==="correct" || (this.triesCount === 0 && this.correctWord.split('').every(r => this.currentTry.includes(r))) || this.triesRemaining <= 0)
            },
            async generateImage() {
                this.loadingImage = true;
                this.currentImage = await this.fetchImage(this.answers?.[this.currentWordIndex]?.en)
            },
            loadingImage: false,
            //Options
            triesRemaining: this.$persist(0),
            lettersCount: this.$persist(8),
            triesCount: this.$persist(0),
            answers: [{ ar: 'ذئب', en: 'wolf' }, { ar: 'برتقال', en: 'orange' }, { ar: 'فأرة', en: 'mice' }],
            //Static
            letters: [
                'ى', 'ئ', 'ؤ', 'آ', 'إ', 'أ', 'ء',
                'ض', 'ص', 'ث', 'ق', 'ف', 'غ', 'ع', 'ه', 'خ', 'ح', 'ج',
                'ش', 'س', 'ي', 'ب', 'ل', 'ا', 'ت', 'ن', 'م', 'ك', 'ط',
                'ذ', 'ر', 'ة', 'و', 'ز', 'ظ', 'د',
            ],
            get resultTitle() {
                const percent = this.triesRemaining/this.triesCount;
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

                return "حاول من جديد!";
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
            //Animations
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
                    }).add({
                        targets: '#letters>button',
                        scale: [0, '100%'],
                        delay: function (el, i, l) {
                            return i * 100;
                        }
                    }, '-=600').add({
                        targets: animateIn ? '#slots>span' : '#slots',
                        scale: [0, '100%'],
                        delay: function (el, i, l) {
                            return i * 50;
                        },
                    }, '-=1200')
                    tl.finished.then(resolve);
                })
            },
        }
    })
})
