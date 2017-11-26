import {generateVoronoiPoints, generateL1Voronoi} from "./src/voronoi.js";

let main = document.getElementById("main");
let diagram = document.getElementById("diagram");
let svg = document.getElementById("svg");
let canvas = diagram.getContext("2d");
let width = 400;
let height = 400;
diagram.height = height;
diagram.width = width;
svg.setAttribute("height", height);
svg.setAttribute("width", width);
let imageData = canvas.createImageData(width, height);

function randomNormal(sharpness){
    return new Array(sharpness).fill(0).map(e => Math.random()).reduce((c,e) => c + e, 0) / sharpness;
}

let euclideanCallback = function(a,b){ return Math.sqrt(Math.pow(a[0] - b[0],2) + Math.pow(a[1] - b[1],2)) };
let manhattanCallback = function(a,b){ return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) };

let raw = new Array(1024).fill(0).map(e => [randomNormal(2) * width, randomNormal(2) * height]);
//let raw = [[77.61065242536903,246.33245882962115],[94.90867692526774,121.0366181168756],[105.01541726898313,237.0567359267696],[108.66108308754309,319.4049119475416],[111.2763719132499,201.65545532534273],[115.88366260747125,196.28875655020303],[118.12546296467397,325.62955381313856],[122.66972041696698,196.02386756414538],[123.21379517988697,134.30197246183795],[133.9450450678297,52.67593813809728],[134.88055764406357,315.2568707708246],[139.38072095034255,145.77175529538331],[139.94902195557387,225.53525750523642],[140.60398728189259,221.65738401420296],[150.01753392005074,313.92526620978185],[151.2919169908887,238.72684010985603],[153.7560298086193,246.71686310601427],[163.3130753386515,221.2036372124218],[169.90710724357513,128.84810438783353],[171.69327032743973,304.74681364547865],[174.35543908218887,194.15552736509713],[174.74250142541305,114.11383560793355],[179.0917062943838,169.61062277753092],[188.02439127830328,191.2076775651459],[190.29758187643097,201.719594235266],[192.45655497550422,305.3032936532212],[194.47104547762888,149.20337388771395],[194.72264874389867,179.81751092033454],[200.49638470832667,63.370510531102966],[207.66651631224656,171.63373891819904],[207.96555946355295,88.36903026115701],[212.35850905842844,114.05307324073956],[213.49423656659167,291.3310294350417],[225.53198817251263,353.7473737500669],[226.30583061417312,266.72831809864357],[227.6530397531109,127.92598657391308],[229.876632973155,107.3465720867779],[235.55351058948557,26.63536656630061],[235.79033794235764,83.16372530365737],[236.4450798319433,385.6979987341058],[238.43296107907847,156.81359341659933],[238.45407799083577,175.4180454484903],[247.18794506604985,143.7966259150787],[247.3027856638106,171.9441642516779],[249.16937084715562,253.9131719076996],[250.81338824124032,320.2270796380284],[251.9951557837837,35.36739887835658],[256.9039371979416,261.99186635508903],[258.4240443058085,72.00504497613255],[270.7073976699238,303.1329587130543],[272.40231345928623,329.8595504068467],[281.7366939312898,142.42254718452023],[283.2774228755713,199.07653079338655],[284.30978499564975,139.88878600701833],[291.64387482679575,245.1393232223007],[293.48143671262596,241.99603145037543],[299.14984763205564,208.54499803534367],[314.908803395613,240.02930319708372],[317.24401812360264,342.4505541550271],[318.63155607268243,301.83198955392135],[319.6834826171549,189.1702081895613],[323.20261506322777,271.33968387760825],[325.64668242511755,288.18975664417485],[329.6460251958274,287.85887967949674]];
//let sites = raw.slice(35,59);
//let sites = raw.slice(16,24);
let sites = raw.slice(0);
console.log(JSON.stringify(sites.sort((a,b) => a[0] - b[0])));
console.log(sites.length);

let rawData = generateVoronoiPoints(sites ,width, height, manhattanCallback );
let vectorPoints = generateL1Voronoi(sites ,width, height);

for (var i=0;i<imageData.data.length;i+=4)
{
    imageData.data[i+0]=rawData[i/4][0];
    imageData.data[i+1]=rawData[i/4][1];
    imageData.data[i+2]=rawData[i/4][2];
    imageData.data[i+3]=255;
}

canvas.putImageData(imageData,0,0);

canvas.fillStyle = "#000000";

sites.forEach(e => {
    canvas.beginPath();
    canvas.arc(e[0], e[1], 2, 0, Math.PI * 2,);
    canvas.fill();
});

// draw svg shapes
vectorPoints.forEach(site =>{

    site.bisectors.forEach(bisector => {
        var newElement = document.createElementNS("http://www.w3.org/2000/svg", 'polyline'); //Create a path in SVG's namespace
        newElement.setAttribute("points", bisector.points.map(e => e.join(",")).join(" ")); //Set path's data
        newElement.style.stroke = bisector.mergeLine ? getColor(bisector.mergeLine) : "#000"; //Set stroke colour
        newElement.style.fill = "none";
        newElement.style.strokeWidth = "1px"; //Set stroke width
        svg.appendChild(newElement);

        bisector.intersections.forEach(intersect => {
            var intersectCirc = document.createElementNS("http://www.w3.org/2000/svg", 'circle'); //Create a path in SVG's namespace
            intersectCirc.setAttribute("cx", intersect[0]); //Set path's data
            intersectCirc.setAttribute("cy", intersect[1]); //Set path's data
            intersectCirc.setAttribute("r", 1); //Set path's data
            intersectCirc.style.fill = "#F00"; //Set stroke colour
            svg.appendChild(intersectCirc);
        });

    });

   
    
    

    var siteCirc = document.createElementNS("http://www.w3.org/2000/svg", 'circle'); //Create a path in SVG's namespace
    siteCirc.setAttribute("cx", site.site[0]); //Set path's data
    siteCirc.setAttribute("cy", site.site[1]); //Set path's data
    siteCirc.setAttribute("r", 2); //Set path's data
    siteCirc.style.fill = "#000"; //Set stroke colour
    svg.appendChild(siteCirc);
});

function getColor(color){
    switch(color){
        case 4:
            return "#4286f4";
        break;
        case 8:
            return "#44f453";
        break;
        case 16:
            return "#931d78";
        break;
        case 32:
            return "#ff3c35";
        break;
        case 64:
            return "#f4ad42";
        break;   
        case 128:
            return "#009182";
        break;   
        default:
            return "#00FF00";
    }
}

//main.textContent = JSON.stringify(vectorPoints, null, 4);