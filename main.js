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

//let raw = new Array(32).fill(0).map(e => [Math.floor(randomNormal(2) * width), Math.floor(randomNormal(2) * height)]);
//let raw = new Array(32).fill(0).map(e => [randomNormal(2) * width, randomNormal(2) * height]);
//let raw = [[100,100],[175,175],[225,225],[300,300]];
//let raw = [[53,162],[61,185],[86,225],[95,164],[96,72],[98,267],[101,237],[105,217],[111,213],[118,117],[119,183],[136,267],[152,148],[167,276],[168,287],[183,69],[187,149],[193,225],[195,249],[220,119],[234,201],[239,215],[249,170],[268,306],[273,252],[279,173],[285,227],[308,273],[313,360],[319,43],[319,192],[360,196]];
//let raw = [[72,120],[79,272],[100,165],[101,194],[113,75],[115,242],[115,203],[123,202],[134,163],[136,167],[136,319],[150,206],[155,122],[160,207],[181,80],[181,304],[185,146],[192,223],[195,204],[222,82],[225,75],[236,85],[256,41],[264,186],[267,283],[268,213],[296,125],[304,264],[308,121],[313,165],[318,287],[336,187]];
let raw = [[35,272],[37,325],[75,206],[77,81],[108,197],[115,200],[120,147],[132,321],[137,161],[152,174],[154,187],[166,339],[173,94],[189,288],[192,232],[206,365],[232,288],[247,191],[252,153],[254,357],[268,114],[271,172],[275,253],[309,237],[314,233],[317,169],[322,318],[336,210],[344,160],[375,152],[380,129],[380,327]];
let sites = raw.slice(16);
console.log(JSON.stringify(sites.sort((a,b) => a[0] - b[0])));
console.log(sites.length);
document.getElementById("points").textContent = JSON.stringify(sites.sort((a,b) => {
    if(a[0] !== b[0]){
        return a[0] - b[0]
    }
    else{
        return a[1] - b[1]
    }
}), null);

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

    let filteredBisectors = site.bisectors.map(e => {
        return !e.compound ?
               e :
               e.points.find(d => d.site === site);
    })
    
    filteredBisectors.forEach(bisector => {
        var newElement = document.createElementNS("http://www.w3.org/2000/svg", 'polyline'); //Create a path in SVG's namespace
        newElement.setAttribute("points", bisector.points.map(e => e.join(",")).join(" ")); //Set path's data
        newElement.setAttribute("parents", bisector.sites.map(e => e.site.join(",")).join(" | "));
        newElement.setAttribute("site", site.site.join(","));
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
    
    /*
    var newElement = document.createElementNS("http://www.w3.org/2000/svg", 'path'); //Create a path in SVG's namespace
    newElement.setAttribute("d", site.d); //Set path's data
    newElement.setAttribute("class", "polygon"); //Set path's data    
    newElement.style.stroke = "#000"; //Set stroke colour
    newElement.style.strokeWidth = "1px"; //Set stroke width
    svg.appendChild(newElement);
    */
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