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

let raw = new Array(40).fill(0).map(e => [randomNormal(2) * width, randomNormal(2) * height]);
//let raw = [[62.530666858000615,110.15574589200754],[76.73642547622488,342.0385804330675],[107.12234972277508,186.88826257322617],[111.39263316932984,372.4442865547021],[154.00095917916894,182.49617790597532],[177.9969663696,296.15268845721016],[211.17536846856405,356.37948357567507],[221.38107495521834,233.21436705300266],[266.96631965141427,118.91850702924395],[298.6358548847654,191.4053632598975]];
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
    canvas.arc(e[0], e[1], 1, 0, Math.PI * 2,);
    canvas.fill();
});

// draw svg shapes
vectorPoints.forEach(site =>{
    /*
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
    */
   
    var newElement = document.createElementNS("http://www.w3.org/2000/svg", 'path'); //Create a path in SVG's namespace
    newElement.setAttribute("d", site.d); //Set path's data
    newElement.setAttribute("class", "polygon"); //Set path's data    
    newElement.style.stroke = "#000"; //Set stroke colour
    newElement.style.strokeWidth = "1px"; //Set stroke width
    svg.appendChild(newElement);
    /*
    var start = document.createElementNS("http://www.w3.org/2000/svg", 'circle'); //Create a path in SVG's namespace
    start.setAttribute("cx", site.polygonPoints[0][0]); //Set path's data
    start.setAttribute("cy", site.polygonPoints[0][1]); //Set path's data
    start.setAttribute("r", 2); //Set path's data
    start.style.fill = "#f00"; //Set stroke colour
    svg.appendChild(start);

    var end = document.createElementNS("http://www.w3.org/2000/svg", 'circle'); //Create a path in SVG's namespace
    end.setAttribute("cx", site.polygonPoints[site.polygonPoints.length - 1][0]); //Set path's data
    end.setAttribute("cy", site.polygonPoints[site.polygonPoints.length - 1][1]); //Set path's data
    end.setAttribute("r", 2); //Set path's data
    end.style.fill = "#f00"; //Set stroke colour
    svg.appendChild(end);
    */
    var siteCirc = document.createElementNS("http://www.w3.org/2000/svg", 'circle'); //Create a path in SVG's namespace
    siteCirc.setAttribute("cx", site.site[0]); //Set path's data
    siteCirc.setAttribute("cy", site.site[1]); //Set path's data
    siteCirc.setAttribute("r", 1); //Set path's data
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
            return "#000000";
    }
}

//main.textContent = JSON.stringify(vectorPoints, null, 4);