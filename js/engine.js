    let remarksArray = [];
    /* -----------------------------------------------------------------------------
	Onload
	----------------------------------------------------------------------------- */

    window.onload = function() {

        chargeProfile();
    }


    /* -----------------------------------------------------------------------------
         Cookies: To provide the server with any necessary informations
        ----------------------------------------------------------------------------- */

    var params = {};
    var track = {"words":[], "rules": []}; // track identified Errors

    function chargeProfile(){

        if(checkStorage('params')){
            params = getStorage('params');
            track = getStorage('track');
        }else{
            loc = getLocation();
            params = {
                "profileid": (Math.floor(Math.random() * (100000 - 0)) + 100000) +''+ Date.now(), // Random UserID
                'ignoreDeclensions': true, // Ignore correcting declensions
                'ignorePunctuation': true, // Ignore correcting punctuation
                'indicateDeclensions': true, // Indicate the right declensions at the end
                'lang': 'ar',
                'playrate': 1,
                'volume': 1,
                'country': loc["country"],
                'variety': -1, // linguistic variety, could be based on region e.g.: Cairo dialect or Urdu
                'level': -1, // 0-8
                'nbrOfTrackedWords': 100, // number of misspelled words to track
                'usesScreenReader': false, // in order to hide some details or visual games for Visual impairment or blindness
            };
            track = {
                    "rules": [],
                    "words": [], //misspelled words should be a stack of 100? if push pop && with weight of reoccurance if he makes a lot of mistakes on the same word
            };
            updateStorage('params');

            updateStorage('track');
        }
    }

    function checkStorage(variable){ // returns true if it exists
        return (Cookies.get('params') !== undefined);
    }

    function updateStorage(variable){
        Cookies.set(variable, JSON.stringify(window[variable]), { sameSite: 'strict' });
    }

    function getStorage(variable){
        return checkStorage(variable)?JSON.parse(Cookies.get(variable)):{};
    }



    /* -----------------------------------------------------------------------------
        Normalize Time
        وثلث، إلا ربع،
        * Add rules to correct فع ونصب ثلاثون ثلاثين
        ----------------------------------------------------------------------------- */

    function normalizeTime(text) {

        return text.replace('الساعة','').replace('ربع','خمس عشرة دقيقة').replace('نصف', 'ثلاثون دقيقة');

    }

    /* -----------------------------------------------------------------------------
        Correct
        ----------------------------------------------------------------------------- */


    function correct(dinput, validText, gametype) {
        let remarksArray = [];

        // Filter the allowed chars
        validText = filterInput( validText );


        dinput = filterInput(dinput);
        model_declension = filterInput(validText); 	//with declensions

        if(gametype == "time")
            dinput = normalizeTime(dinput);

        if(true || params['ignoreDeclensions']){ // clean declensions
            validText = cleanText(validText);
            dinput = cleanText(dinput);
        }

        if(true || params['ignorePunctuation']){
            dinput = cleanPunctuation(dinput);
            validText = cleanPunctuation(validText);
            model_declension = cleanPunctuation(model_declension);
        }

        //analyzeText extraction
        diffs = extractDiffs(validText, dinput);
        console.log("Extraction: Generating diffs");
        console.log(diffs);

        wordset = tokenize(diffs, validText);
        console.log("Tokenization into words");
        console.log(wordset);

        wordset = parse(wordset);
        if(!params['ignorePunctuation'])
            wordset = parsePunctuation(wordset);

        console.log("Parse and tag errors");
        console.log(wordset);


        var output = printDiffs(diffs, wordset);

        //logData(dinput, processed, score["percent"], wordset);

        console.log("track");
        console.log(getStorage("track"));

        return output;

    }

    /* -----------------------------------------------------------------------------
         Text processing, misspelling
        ----------------------------------------------------------------------------- */

    function extractDiffs(validText, dinput){
        /* Generate the differences */

        var dmp = new diff_match_patch();
        var diffs = dmp.diff_main(dinput, validText, false); // Result: [(-1, "Hell"), (1, "G"), (0, "o"), (1, "odbye"), (0, " World.")]
        dmp.diff_cleanupSemantic(diffs); // Result: [(-1, "Hello"), (1, "Goodbye"), (0, " World.")]

        return diffs;
    }


    function tokenize(diffs, validText){

        var diffs_bywords = [];
        var word = [];

        $.each(diffs, function(i, diff) {

            splitword = splitToWords(diff);
            if(splitword.length == 1){ //no space
                    word.push(splitword[0]);

            }else{ //has space

                for(j=0;j<splitword.length;j++){

                    if(splitword[j] != ""){ // not empty

                        if(j < (splitword.length - 1)){ // as long as there is a space push to a new word
                            word.push(splitword[j]);
                            diffs_bywords.push(word);
                            word = [];
                        }else{
                            word.push(splitword[j]);
                        }

                    }else if(word.length > 0){ // if there is a space linked in the beginning/end & word is not empty
                            diffs_bywords.push(word);
                            word = [];
                    }
                }
            }

            if(i+1 == diffs.length){ // add the last word to the wordset
                diffs_bywords.push(word);
            }
        });


        //split into a function named enrich() with diacritics morpholgical diacritics, POS, lemmas
        // Extract lemmas
        var lemmata = lemmatize(validText);

        // make a version with harakat
        var decomposed = extractLettersWithHarakat(model_declension);
        var x = 0;

        // Post processing to check and avoid temporarily some non-optimized cases
        for(i=0;i<diffs_bywords.length;i++){

            word = {"input":"", "valid":"", "full":""};
            // index of mixture if the word is purely wrong/added or
            diffs_bywords[i]["harakat"] = "";


            for(j=0;j<diffs_bywords[i].length;j++){
                diffs_bywords[i][j]["harakat"] = "";

                //full string
                // clean empty cases
                if(diffs_bywords[i][j][1] == ""){
                    diffs_bywords[i].splice(j, 1); // the index will change
                    j--;
                }else{ //

                    if(diffs_bywords[i][j][0] != 1)
                        word["input"] += diffs_bywords[i][j][1];

                    if(diffs_bywords[i][j][0] == 0 || diffs_bywords[i][j][0] == 1)
                        word["valid"] += diffs_bywords[i][j][1];

                    // Harakat
                    if(diffs_bywords[i][j][0] == 0 || diffs_bywords[i][j][0] == 1){


                        for(k=0;k<diffs_bywords[i][j][1].length;k++){
                            //console.log("=== k: "+k+" / "+diffs_bywords[i][j][k]+" ===");

                            diffs_bywords[i][j]["harakat"] += decomposed[x];

                            //console.log("x: "+ x+" "+decomposed[x]);

                            x++;
                        }
                         //part to word
                        diffs_bywords[i]["harakat"] += diffs_bywords[i][j]["harakat"];
                    }
                }

            }
            diffs_bywords[i]["string"] = word;
            if(i in lemmata) diffs_bywords[i]["lemma"] = lemmata[i];
            //diffs_bywords[i]["POS"] = getMorphology(diffs_bywords[i]["harakat"])["POS"];

            //if async:
            //getMorphology(diffs_bywords[i]["POS"], diffs_bywords[i]["string"]["valid"]);

        }

        return diffs_bywords;
    }

    /* -----------------------------------------------------------------------------
         A split-like function that splites a text based on space to extract words and pnctuation
        ----------------------------------------------------------------------------- */

    function splitToWords(input) {
        var parts = [[input[0], ""]];
        var j = 0; // parts' incremental

        for (var i = 0; i < input[1].length; i++) {

            currentChar = input[1].charAt(i);

             if(currentChar.match(ruleset['punctuation']['regex'])){
                j++;
                parts.push([input[0], currentChar]);

                // if punctuation and not at the end of the whole text and is not followed by a space
                //if(i<input[1].length+1)
                    //input[1].charAt(i))

            } else if (currentChar == " ") {
                if(input[0] != -1){ // @torevise space is not to remove
                    j++;
                    //if(!(input[1].charAt(i+1)).match(/[،,:؟؛!.]/g)) // to avoid space-punctuation-space
                    //if(i != input[1].length)
                    parts.push([input[0], ""]);
                    // if followed by a punctuation mark an error
                }

            } else { // not a space or a punctuation
                parts[j][1] += currentChar;
            }
        }

        return parts;
    }

    /* -----------------------------------------------------------------------------
         Print differences
        ----------------------------------------------------------------------------- */

    function printShortDiff(wordset){

    }

    function printDiffs(diffs, wordset){

        revision = ["", "", "", "", ""];

        // Print the differences
        $.each(diffs, function(i, diff) {

            if(diff[0] == 0){
                revision[0] += diff[1];
            }else if(diff[0] == -1){
                revision[0] += '<span style="color:red;background:#eee;" >'+diff[1]+'</span>';
            }else if(diff[0] == 1){
                revision[0] += '<span style="color:green;background:#eee;">'+diff[1]+'</span>';
            }
        });


        // Print revised 2
        $.each(wordset, function(ri, word) {

            $.each(word, function(rj, part) {
                var note = "";

                if("remark" in part){
                    remarks = "";

                    $.each(part["remark"], function(rk, remark) {
                        remarks += remark+"<br/>";
                    });

                    note = 'class="tooltip" title="'+remarks+'"';

                }

                if(part[0] == 0){
                    if(note == "")
                        revision[1] += part[1];
                    // Like waw
                    else
                        revision[1] += '<span '+note+' style="color:orange;background:#eee;">'+part[1]+'</span>';

                }else if(part[0] == -1){
                        revision[1] += '<span '+note+' style="color:red;background:#eee;">'+part[1]+'</span>';

                }else if(part[0] == 1){
                    revision[1] += '<span '+note+' style="color:green;background:#eee;">'+part[1]+'</span>';
                }
            });
            revision[1] += ' / ';


        });

        // Print revised 3
        $.each(wordset, function(ri, word) {

            $.each(word, function(rj, part) {
                var note = "";

                if("remark" in part){
                    remarks = "";
                    $.each(part["remark"], function(rk, remark) {
                        remarks += remark+"<br/>";
                    });

                    note = 'class="tooltip" title="'+remarks+'"';
                }

                if(part[0] == 0){
                    if(note == "")
                        revision[2] += part[1];
                    // Like waw
                    else
                        revision[2] += '<span '+note+' style="color:orange;background:#eee;">'+part[1]+'</span>';

                }else if(part[0] == -1){
                    //if(note != "")
                    //if( ( ((rj+1) in word) && (word[rj+1][0] == 1)) ){

                    //}else
                        if(!("hidden" in part))
                            revision[2] += '<span '+note+' style="color:red;background:#eee;">'+part[1]+'</span>';

                    /*else{
                        if(rj+1 in word){ // alif in هاذا
                            if(word[rj+1][0] == 0)
                                pushRemark(word[rj+1], "خطأ");
                        }else{ //a part to delete at the end like نكتبوا
                            revision[2] += '<span style="color:red;background:#eee;">'+part[1]+'</span>';
                        }
                    }*/
                }else if(part[0] == 1){
                    revision[2] += '<span '+note+' style="color:green;background:#eee;">'+part[1]+'</span>';
                }
            });

            // if it's a level word error
            if("remark" in word){
                //if(note == "") embed the whole word current_revision

                revision[2] += '<span class="tooltip" title="'+word["remark"]+'"'+' style="color:red;">*</span>';

            }

            if("lemma" in word){
                revision[4] += word["lemma"];

            }


            revision[2] += ' ';
            revision[3] += word["harakat"]+' / ';
            revision[4] += ' / ';
        });


        return revision;
    }

    /* -----------------------------------------------------------------------------
         Adds spelling remarks and advises to the wordset
         * TODO Combine word pattern &
        ----------------------------------------------------------------------------- */

    function parse(wordset){

        $.each(wordset, function(iword, word) {

            //metathesis
            $.each(word, function(ipart, part) {
                $.each(ruleset['metathesis'], function(irule, rule) {
                    if(((ipart+1) in word)){ // a word of 2 letter at least

                        if( (word[ipart][0] == -1 && word[ipart][1].match(rule[0])) && (word[ipart+1][0] == 1 && word[ipart+1][1].match(rule[1])) ){
                            pushRemark(word[ipart+1], rule[2]);
                            word[ipart]["hidden"] = 1;
                            $("#remarks-other").append(rule[2]+"<br/>");
                            remarksArray.push([[rule[2]]]);

                            trackRule("metathesis", irule, -0.1);
                        }
                    }
                    // we consider correction only if he writes the full word correctly?
                    if(word["string"]["valid"] == word["string"]["input"] && word["string"]["valid"].match(rule[1])){
                        //either verify the word[ipart][0] == 0 or word::input = word::valid
                        trackRule("metathesis", irule, 0.02);
                    }
                });
            });

            //metathesis with harakat
            // TODO check if it's one alif or one yaa or one waw and then parse?
            $.each(word, function(ipart, part) {
                $.each(ruleset['metathesis-harkat'], function(irule, rule) {
                    // Compared with
                    if((ipart-1) in word){

                        if( (word[ipart][0] == -1 && word[ipart][1].match(rule[0])) && (word[ipart-1][0] == 0 && word[ipart-1]["harakat"].match(rule[1])) ){
                            word[ipart]["hidden"] = 1;
                            pushRemark(word[ipart-1], rule[2]);

                            /*
                            if((3 in rule) && ("POS" in rule[3])){
                                if(rule[3]["POS"] == getMorphology(word))
                                    console.log("خطأ التاء مع "+word+" / "+rule[3]["POS"]);
                                    $("#remarks-other").append("خطأ التاء مع "+word+" / "+rule[3]["POS"]+"<br/>");
                            }else{

                                $("#remarks-other").append(rule[2]+"<br/>");
                            }*/

                            //make cases & break
                            if( 3  in rule){
                                if("cases" in rule[3] ){
                                    $.each(rule[3]['cases'], function(icase, xcase) {
                                        if("POS" == ""){
                                            //getMorphology(word)

                                        }
                                    });

                                }else if( "exclude" in rule[3] ){
                                        if("word" in rule[3]["exclude"] && word["string"]["valid"].match(rule[3]["exclude"]["regex"])){

                                            pushRemark(word[ipart-1], "مستثناة");
                                        }
                                }
                            }
                        }
                    }
                });
            });


            // Word for word or part for part parsing from the word, to analyze
            $.each(ruleset['word-pattern'], function(irule, rule) {
                if( (word["string"]["valid"] != word["string"]["input"])
                        && word["string"]["valid"].match(rule[0]) && word["string"]["input"].match(rule[1])){
                        pushRemark(word, rule[2]);
                        $("#remarks-other").append(rule[2]+"<br/>");
                        remarksArray.push([[rule[2]]]);
                    }
            });
            // waw example
            $.each(ruleset['separated'], function(irule, rule) {
                if( (word[0][0] == 0 && word[0][0] == 0)
                    && word[0][1].match(rule[0])){
                        pushRemark(word, rule[1]);
                        $("#remarks-other").append(rule[2]+"<br/>");
                        remarksArray.push([[rule[2]]]);
                    }
            });

            /*$.each(ruleset['separated'], function(irule, rule) {
                if( (word["string"]["valid"] == word["string"]["input"])
                    && word["string"]["input"].match(rule[0])){
                        pushRemark(word, rule[1]);
                        $("#remarks-other").append(rule[2]+"<br/>");
                    }
            });*/

            // Compare to lemma
            $.each(ruleset['lemma-pattern'], function(irule, rule) {
                if( ("lemma" in word) && (word["string"]["valid"] != word["string"]["input"])
                        && word["lemma"].match(rule[1]) && word["string"]["input"].match(rule[0])){
                        pushRemark(word, rule[2]);
                        $("#remarks-other").append("Lemma : "+rule[2]+"<br/>");
                    }
            });


            //if(!("1" in word) && (!("remark" in word) || (word[0]["remark"]==""))){
            if(!("1" in word) && !("remark" in word[0])){
                if(word[0][0] == 0){
                    //pushRemark(word[0], '<b>'+word[0][1]+"</b>"+" كلمة سليمة");
                    $("#remarks-other").append('<b>'+word[0][1]+"</b>"+" كلمة سليمة");
                    //remarksArray.push([word[0][1], 'كلمة سليمة']);
                }else if(word[0][0] == 1){
                    pushRemark(word[0], '<b>'+word[0][1]+"</b>"+" كلمة منسية");
                    $("#remarks-other").append('<b>'+word[0][1]+"</b>"+" كلمة منسية");
                    remarksArray.push([[word[0][1]], 'كلمة منسية']);
                }else if(word[0][0] == -1){
                    pushRemark(word[0], '<b>'+word[0][1]+"</b>"+" كلمة خاطئة أو غير موجودة");
                    $("#remarks-other").append('<b>'+word[0][1]+"</b>"+" كلمة خاطئة أو غير موجودة");
                    remarksArray.push([[word[0][1]], 'كلمة خاطئة أو غير موجودة']);
                }

            }


            // externalize these prints later
            if(word["string"]["input"] != word["string"]["valid"]){
                trackMisspelledWords(word["string"]["valid"], 1);
                $("#remarks-other").append("<hr/><b>* "+word["string"]["input"]+" => "+word["string"]["valid"]+"</b><br/>");
                remarksArray.push([[word["string"]["input"], word["string"]["valid"]]]);
            }else{
                trackMisspelledWords(word["string"]["valid"], -1);
                $("#remarks-other").append("<hr/><b>* "+word["string"]["valid"]+"</b> (صحيحة)<br/>");
            }


        });
        //console.log(wordset);
        return wordset;
    }

    /* -----------------------------------------------------------------------------
         Adds punctuation remarks to the wordset
        ----------------------------------------------------------------------------- */
    function parsePunctuation(wordset){

        $("#remarks-punctuation").html("");

        $.each(wordset, function(iword, word) {

            // Punctuation error: either missing or addition
            //console.log(word);
            if(word.length == 1 && word[0][0] != 0 && (used_punctuation = word[0][1].match(ruleset['punctuation']['regex']))){
                $.each(used_punctuation, function(isymbole, symbole) {
                    //console.log("punctuation");
                    pushRemark(word[0], ruleset['punctuation']['notes'][symbole])
                    $("#remarks-punctuation").append("<li>"+ruleset['punctuation']['notes'][symbole]+"</li>");
                });
            }

        });

        return wordset;
    }
    /* -----------------------------------------------------------------------------
         pushRemark
        ----------------------------------------------------------------------------- */
    function pushRemark(wordpart, remark){
        (wordpart["remark"] = wordpart["remark"] || []).push(remark);
    }

    /* -----------------------------------------------------------------------------
         trackMisspelledWords
         * track["words"] can include 100 word if a word reorccur we add weight to it
         * if the array filled we remove the minimum weight ie the less occuring errors
         * [["cat", 2], ["dog", 1]]
         * Save the array sorted which would make less effort and add at the end
         * [["cat", 2], ["bird", 7], ["dog",1]].sort(function(a, b) { return b[1] - a[1]; });

        * to improve: if array is full and a new word is added once, it will be the same word changing all the time
        ----------------------------------------------------------------------------- */
    function trackMisspelledWords(word, weight){

        var wordsNmbr = track["words"].length;
        var exists = false;
        var minimum;

        if(wordsNmbr > 0){ // not an empty array

            minimum = [track["words"][0][0], track["words"][0][1]]; //value, index

            for (var i = 0; i < wordsNmbr; i++) {

                if(track["words"][i][0] == word){ // exists

                    exists = true;
                    var newWeight = track["words"][i][1] + weight;

                    if(newWeight < 1){ // the word was corrected, remove it from the list
                        track["words"].splice(i, 1);
                    }else
                        track["words"][i][1] = newWeight;

                    updateStorage("track");
                    break;

                }else if(minimum[1] > track["words"][i][1]){
                    minimum[0] = i;
                    minimum[1] = track["words"][i][1];
                }

            }
        }

        if(!exists){ // it doesn't exist

            if(wordsNmbr >= params["nbrOfTrackedWords"]){ // remove the less occuring word and then adding it
                //if(minimum[0]<2){ //if the minimum value occured only once so it's optional to keep it or not
                // diversify training words by accepting it even if the available minimum occured more
                track["words"][minimum[0]][0] = word;
                track["words"][minimum[0]][1] = minimum[1];
                updateStorage("track");
                //}
            }else if(weight > 0){ //less than 100 & is not a correction
                track["words"].push([word, weight]);
                updateStorage("track");
            }
        }
    }

    /* -----------------------------------------------------------------------------
         Track common misspelling found in the ruleset
         evaluteRule [ {category:"metathesis", id:5, scale:0.6} ] //indicator or scale
        ----------------------------------------------------------------------------- */

    function trackRule(category, ruleid, scale){

        var exists = false;

        for (var i = 0; i < track["rules"].length; i++) {

            if(track["rules"][i]["category"] == category && track["rules"][i]["id"] == ruleid){

                exists = true;

                var newScale = (Number(track["rules"][i]["scale"]) + scale).toFixed(2);

                if(newScale<=0){ // the minimum value for scale is 0
                    track["rules"][i]["scale"] = 0; //returns; //break from each
                }else if(newScale>=1){ // pop the rule as the maximum is 1
                    track["rules"].splice(i, 1); // the index will change
                }else{
                    track["rules"][i]["scale"] = newScale;
                }
                break;
                updateStorage("track");
            }
        }

        if(!exists && scale < 0){
                track["rules"].push({"category":category, "id":ruleid, "scale":0.9+scale});
                updateStorage("track");
        }

    }

    /* -----------------------------------------------------------------------------
         Get POS & morphological annotations
        ----------------------------------------------------------------------------- */
    function getMorphology(word){ // ["verb", "..."]

        // POS API
        var detail = {};

        jQuery.ajax({
            type: "GET",
            async: false,
            url: '//amly.nbyl.me/dictation/api.php',
            data:  {"word": word, 'query':"POS"},
            success: function (data)
                {
                    detail = {"POS":data};
                    //console.log("POS: "+word+" is "+data);
                },
            error: function (err)
            { console.log(err.responseText); }
        });

        return detail;
    }

    /* -----------------------------------------------------------------------------
         Get lemma
        ----------------------------------------------------------------------------- */
    function lemmatize(text){

      var output = [];

        /*
        jQuery.ajax({
            type: "POST",
            async: false,
            url: "https://farasa.qcri.org/lemmatization/analyze/",
            data:  {"text" : text, "task" : "lemmatization", "API_KEY": "hoxIHPHtKQJlnwPvtr"},
            //contentType: "application/json; charset=utf-8",
            //dataType: "json",
            success: function (result)
                {
                    output = JSON.parse(result);
                    output = output["text"].split(" ");
                },
            error: function (err)
            { console.log(err.responseText); }
        });
        */
        //console.log(" == lemmatize ==");
        //console.log(output);
        return output;

    }


    /* -----------------------------------------------------------------------------
        Returns useful hints for the comments like: the plural of a noun or the imperfect form of a verb, etc
        ----------------------------------------------------------------------------- */
    function getDifferentForm(word, form){ // ["verb", "..."]

        var newform = "";

        jQuery.ajax({
            type: "GET",
            async: false,
            url: '//amly.nbyl.me/dictation/api.php',
            data:  {"word": word, 'form':form},
            success: function (data)
                {
                    newform = data;
                },
            error: function (err)
            { console.log(err.responseText); }
        });

        return newform;
    }

    /*
        Remove all chars including tatweel except letters, few punctuations and harakat
    */

    function filterInput(text){

        return text.replace(/[^ء-غف-ي \.\،\:\؟\؛\! ًٌٍَُِّْ]/g, '');
    }


    /*
        Clean a string from declensions & successive space, tabs
        * حذف التشكيل والتطويل والفراغات
    */

    function cleanText(text){

        // Unicode: tatweel: 1600 / an: 1611 / un: 1612 / in: 1613 / a: 1614 / u: 1615 / i: 1616 / shadda: 1617 / sukkoon: 1618
        text = text.replace(new RegExp(String.fromCharCode(1617, 124, 1614, 124, 1611, 124, 1615, 124, 1612, 124, 1616, 124, 1613, 124, 1618, 124, 1600), "g"), "");
        text = text.replace("  " , " "); //successive space
        text = text.trim(); //remove spaces in the beginning or at the end

        return text;
    }

    /*
        Remove the predefined punctuation.
    */

    function cleanPunctuation(text){

        return text.replace(ruleset['punctuation']['regex'],'');

    }

    /*
        Extract declensions
        * A word can have 2 harakats like with shadda
    */

    function extractLettersWithHarakat(text){

        return text.match(/[ء-غف-ي\.\،\:\؟\؛\!\,\;\?][ًٌٍَُِّْ]?[ّ]?/g);

    }


    /* -----------------------------------------------------------------------------
         Score functions
        ----------------------------------------------------------------------------- */

    function getScore(validText, dinput, gametype) {
        validText = cleanText(cleanPunctuation(filterInput(validText)))
        dinput = cleanText(cleanPunctuation(filterInput(dinput)))
        if(gametype == "time") {
            validText = normalizeTime(validText);
            dinput = normalizeTime(dinput);
        }

        var percent = similarity(validText, dinput);

        percent = percent.toFixed(2);
        stars = ((percent*5).toFixed());

        percent = (parseFloat(percent)*100).toFixed();

        //console.log("نسبة النجاح ("+percent+"%): "+'<span style="color: gold;">'+"★".repeat(stars)+"☆".repeat(5-stars)+'</span>');

        return percent;
    }

    /*
        Estimate in % the similarity between two strings
    */

    function similarity(s1, s2) {
      var longer = s1;
      var shorter = s2;
      if (s1.length < s2.length) {
        longer = s2;
        shorter = s1;
      }
      var longerLength = longer.length;
      if (longerLength == 0) {
        return 1.0;
      }
      return (longerLength - editDistance(longer, shorter)) / parseFloat(longerLength);
    }

    function editDistance(s1, s2) {
      s1 = s1.toLowerCase();
      s2 = s2.toLowerCase();

      var costs = new Array();
      for (var i = 0; i <= s1.length; i++) {
        var lastValue = i;
        for (var j = 0; j <= s2.length; j++) {
          if (i == 0)
            costs[j] = j;
          else {
            if (j > 0) {
              var newValue = costs[j - 1];
              if (s1.charAt(i - 1) != s2.charAt(j - 1))
                newValue = Math.min(Math.min(newValue, lastValue),
                  costs[j]) + 1;
              costs[j - 1] = lastValue;
              lastValue = newValue;
            }
          }
        }
        if (i > 0)
          costs[s2.length] = lastValue;
      }
      return costs[s2.length];
    }

    /* -----------------------------------------------------------------------------
         logData: Log input and the processed result, this would help improving results
        ----------------------------------------------------------------------------- */
    function logData(input, output, similarity, wordset){
        jQuery.ajax({
            type: "POST",
            async: true,
            url: '//amly.nbyl.me/dictation/logger.php',
            data:  {'input': 'input', 'output':output, 'similarity': similarity, 'json':wordset },
            //dataType: "",
            //contentType: "application/xml; charset=utf-8",
            success: function (data)
                {
                    console.log("log: "+data);
                },
            error: function (err)
            { console.log(err.responseText); }
        });

    }

    /* -----------------------------------------------------------------------------
         Controllers
        ----------------------------------------------------------------------------- */

    function increasePlayRate(wavesurfer){
        if(params["playrate"] <= 1){
            params["playrate"] = (Number(params["playrate"]) + 0.05).toFixed(2);
            wavesurfer.setPlaybackRate(params["playrate"]);
            updateStorage('params');
            $(".playrate").html(params["playrate"])
        }
        console.log("Play rate increased "+params["playrate"]);
    }

    function decreasePlayRate(wavesurfer){
        if(params["playrate"] >= 0.8){
            params["playrate"] = (Number(params["playrate"]) - 0.05).toFixed(2);
            wavesurfer.setPlaybackRate(params["playrate"]);
            updateStorage('params');
            $(".playrate").html(params["playrate"])
        }
        console.log("Play rate decreased "+params["playrate"]);
    }




    /* -----------------------------------------------------------------------------
         Profilization
        ----------------------------------------------------------------------------- */

    // to know example if he is صعيدي and not from cairo, localisation through a map API can be enabled to get closer
    // localize the student

    function getLocation() {
        location_data = [];

         $.ajax({
              url: "//ipinfo.io",
              dataType: 'json',
              async: false,
              data: {},
              success: function(data) {
                console.log(data);
                location_data = data;

              }, error: function (err){
                  console.log(err.responseText);
              }
        });

        return location_data;
    }