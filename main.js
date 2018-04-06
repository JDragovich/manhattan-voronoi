import {generateVoronoiPoints, generateL1Voronoi, cleanData} from "./src/voronoi.js";

let main = document.getElementById("main");
let diagram = document.getElementById("diagram");
let mergeProcess = document.getElementById("merge-process");
let width = 400;
let height = 400;
diagram.setAttribute("height", height);
diagram.setAttribute("width", width);
mergeProcess.setAttribute("height", height);
mergeProcess.setAttribute("width", width);

function randomNormal(sharpness){
    return new Array(sharpness).fill(0).map(e => Math.random()).reduce((c,e) => c + e, 0) / sharpness;
}

let raw = new Array(1024).fill(0).map(e => [Math.floor(randomNormal(2) * width), Math.floor(randomNormal(2) * height)]);
let sites = raw.slice(0);

document.getElementById("points").textContent = JSON.stringify(sites.sort((a,b) => {
    if(a[0] !== b[0]){
        return a[0] - b[0]
    }
    else{
        return a[1] - b[1]
    }
}), null);

let vectorPoints = generateL1Voronoi(sites ,width, height, true);

// draw svg shapes
vectorPoints.forEach(site =>{
    
    site.bisectors.forEach(bisector => {
        var newElement = document.createElementNS("http://www.w3.org/2000/svg", 'polyline'); //Create a path in SVG's namespace
        newElement.setAttribute("points", bisector.points.map(e => e.join(",")).join(" ")); //Set path's data
        newElement.setAttribute("parents", bisector.sites.map(e => e.site.join(",")).join(" | "));
        newElement.setAttribute("site", site.site.join(","));
        newElement.style.stroke = bisector.mergeLine ? getColor(bisector.mergeLine) : "#000"; //Set stroke colour
        newElement.style.fill = "none";
        newElement.style.strokeWidth = "1px"; //Set stroke width
        mergeProcess.appendChild(newElement);
    });
    
    var newElement = document.createElementNS("http://www.w3.org/2000/svg", 'path'); //Create a path in SVG's namespace
    newElement.setAttribute("d", site.d); //Set path's data
    newElement.setAttribute("class", "polygon"); //Set path's data    
    newElement.style.stroke = "#000"; //Set stroke colour
    newElement.style.strokeWidth = "1px"; //Set stroke width
    diagram.appendChild(newElement);

    var siteCirc = document.createElementNS("http://www.w3.org/2000/svg", 'circle'); //Create a path in SVG's namespace
    siteCirc.setAttribute("cx", site.site[0]); //Set path's data
    siteCirc.setAttribute("cy", site.site[1]); //Set path's data
    siteCirc.setAttribute("r", 2); //Set path's data
    siteCirc.style.fill = "#000"; //Set stroke colour
    mergeProcess.appendChild(siteCirc);

    var siteCirc = document.createElementNS("http://www.w3.org/2000/svg", 'circle'); //Create a path in SVG's namespace
    siteCirc.setAttribute("cx", site.site[0]); //Set path's data
    siteCirc.setAttribute("cy", site.site[1]); //Set path's data
    siteCirc.setAttribute("r", 2); //Set path's data
    siteCirc.style.fill = "#000"; //Set stroke colour
    diagram.appendChild(siteCirc);
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