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

//let sites = new Array(8).fill(0).map(e => [randomNormal(2) * width, randomNormal(2) * height]);
let sites = [[178.6978110026753,375.8755327066578],[188.55075344345238,86.75299900906852],[201.2991377878236,338.7527911607224],[247.2143201579776,132.88171488121026],[278.8440831603344,139.43338206991726],[291.00253611821074,208.22676737264715],[312.01329708785227,113.99210497181124],[330.46710342743,16.331058627760964]];
//let sites = [[178.6978110026753,375.8755327066578],[188.55075344345238,86.75299900906852],[201.2991377878236,338.7527911607224],[247.2143201579776,132.88171488121026]];
console.log(JSON.stringify(sites.sort((a,b) => a[0] - b[0])));

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
            intersectCirc.setAttribute("r", 2); //Set path's data
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
        default:
            return "#00FF00";
    }
}

//main.textContent = JSON.stringify(vectorPoints, null, 4);