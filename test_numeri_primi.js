//GENERAZIONE E LETTURA PER "INTERFERENZA" DI NUMERI PRIMI
//DEVI SEMPRE PARTIRE DA UN NUMERO DISPARI
let numero_di_partenza = 89999;
let set_max_num = 100000;

//lo 0 e 2 li do per scontati
//l'1 in realtà sarebbe divisibile solo per se stesso ma per una regola matematica non è primo
numero_di_partenza = 3;
set_max_num = 1000;

let array_buffer = [];
let set_buffer;
let buffer = 0;

//siccome sono tutti dispari i numeri primi, si può partire da 3
for (let moltiplicatore = 3; moltiplicatore < set_max_num; moltiplicatore += 2) {
    //qui basta la metà perchè da 2 a 10000 è il prodotto di 5000
    //nel caso di 3 * x basta 10000 /3
    //e quindi diciamo 10mila / iteratore
    //deve partire da 3 l'iteratore perchè 3 x 1 è primo, invece deve generare quelli non primi e dispari
    for (let iteratore = 3; iteratore < (set_max_num / iteratore); iteratore += 2) {

        buffer = moltiplicatore * iteratore;
        array_buffer.push(buffer);

    }
}
//meglio metterlo qui
set_buffer = [...new Set(array_buffer.sort((a, b) => a - b))];
//ripuliamo la memoria
array_buffer = [];
//console.log(set_buffer);

let array_numeri_primi = [];

let counter = 2;

//console.log(set_buffer[0]);
//Siccome i numeri primi sono tutti dispari si può fare +=2
for (let i = numero_di_partenza; i < set_max_num; i += 2) {
    //console.log("CICLO");
    //deve cercare il numero i in setbuffer[c]
    //se il numero di setbufferc è minore di i e quindi non l'ha trovato deve fermarsi
    //e fare slice dell'array dal punto in cui si trova -1
    for (let c = 0; c < set_buffer[set_buffer.length - 1]; c++) {
        //console.log("L", set_buffer.length);

        //console.log(i, c, set_buffer[c]);
        if (set_buffer[c] === i) {
            //console.log("NUMERO NON PRIMO");
            set_buffer = set_buffer.slice(c);
            //console.log("L", set_buffer.length);
            break;
        } else if (set_buffer[c] > i) {
            console.log(counter + "° NUMERO PRIMO", i);
            //set_buffer = set_buffer.slice(c);
            array_numeri_primi.push(i);
            counter++;
            //console.log("SL", sl);
            break;
        } else {

        }
    }
}


console.log("Punti per Grafico");
console.log("https://www.youmath.it/ym-tools-calcolatore-automatico/geometria-analitica/disegna-piano-cartesiano-online.html");
console.log(array_numeri_primi.map((v, i) => "(" + (Number(i) + 2) + "," + v + ")").join(','));
console.log("DISTANZA TRA I NUMERI");
//console.log(array_numeri_primi.map((v, i, a) => "(" + Number(i) + "," + (v - a[i - 1]) + ")").join(','));
//partendo da 0. da 0 a 2 2, da 2 a 3 1, da 3 a 5 2 ecc..
//2-1-2-2-4-2-4-2-4-6-2-6-4-2-4-6-6-2-6-4-2-6-4-6-8
console.log(array_numeri_primi.map((v, i, a) => {
    if (!isNaN(v - a[i - 1])) {
        return (v - a[i - 1]);
    } else {
        return "2-1";
    }
}).join('-'));
process.exit();