var T2S;

if("speechSynthesis" in window || speechSynthesis){ // Checking If speechSynthesis Is Supported.
    T2S = window.speechSynthesis || speechSynthesis; // Storing speechSynthesis API as variable - T2S
     // To Speak The Utterance
    window.onbeforeunload = function(){
        T2S.cancel(); // To Stop Speaking If the Page Is Closed.
    }
}

document.addEventListener('alpine:init', () => {
    Alpine.data('game', function () {
        return {
            async init() {
                if(this.generatedLetters === ''){
                    this.nextWordClicked()
                }
            },
            currentWordIndex: this.$persist(0),
            get correctWord() { return this.answers?.[this.currentWordIndex]?.ar ?? '' },
            currentImage: this.$persist(''),
            currentTry: this.$persist(''),
            generatedLetters: this.$persist(''),
            generateLetters() {
                let tmp = this.correctWord;
                for(let i = 0, l=this.lettersCount-tmp.length; i < l; i++)
                {
                    let rdmL = '';
                    while (rdmL === "" || tmp.includes(rdmL)) {
                        rdmL = this.letters[Math.floor(Math.random()*this.letters.length)]
                    }
                    tmp+=rdmL;
                }
                this.generatedLetters = this.shuffle(tmp)
            },
            getLetterState(letter) {
                return this.correctWord.includes(letter) && this.currentTry.includes(letter) ? "correct" : (
                    this.currentTry.includes(letter) ? "wrong" : ""
                );
            },
            insertLetter(letter) {
                this.currentTry += letter
            },
            nextWordClicked() {
                this.currentTry = '';
                this.currentWordIndex++;
                if (this.currentWordIndex >= this.answers.length) {
                    this.currentWordIndex = 0;
                }
                this.generateLetters()
                this.generateImage()
            },
            speaking: false,
            readWord() {
                var msg = new SpeechSynthesisUtterance()
                msg.lang='ar'
                msg.text=this.correctWord
                msg.onend = (event)=> {
                    this.speaking = false;
                }
                this.speaking = true;
                T2S.speak(msg);
            },
            get openModal() {
                return this.correctWord.split('').every(r=> this.currentTry.includes(r))
            },
            async generateImage() {
                this.currentImage = null;
                this.currentImage = await this.fetchImage(this.answers?.[this.currentWordIndex]?.en)
            },
            //Options
            lettersCount: 8,
            answers: [{ar:'ذئب', en:'wolf'}, {ar:'برتقال', en:'orange'}, {ar:'فأرة', en:'mice'}],
            //Static
            letters: [
                'ى','ئ','ؤ','آ','إ','أ','ء',
                'ض','ص','ث','ق','ف','غ','ع','ه','خ','ح','ج',
                'ش','س','ي','ب','ل','ا','ت','ن','م','ك','ط',
                'ذ','ر','ة','و','ز','ظ','د',
            ],
            //Tools
            //API
            async fetchImage(word) {
                let data = await fetch("https://pixabay.com/api/?key=27297690-f114455757e5b498e86889b33&image_type=photo&editors_choice=1&q="+word);
                data = await data.json()
                let image = data.hits[Math.floor(Math.random()*data.hits.length)].webformatURL
                return image
            },
            //Strings
            shuffle: str => [...str].sort(()=>Math.random()-.5).join(''),
            isLetter(str) {
                return str.length === 1 && str.match(/[\u0600-\u06FF]/)?.[0];
            },
        }
    })
})
