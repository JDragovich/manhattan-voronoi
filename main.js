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

let raw = new Array(32).fill(0).map(e => [Math.floor(randomNormal(2) * width), Math.floor(randomNormal(2) * height)]);
//let raw = new Array(32).fill(0).map(e => [randomNormal(2) * width, randomNormal(2) * height]);
//let raw = [[100,100],[175,175],[225,225],[300,300]];
//let raw = [[53,162],[61,185],[86,225],[95,164],[96,72],[98,267],[101,237],[105,217],[111,213],[118,117],[119,183],[136,267],[152,148],[167,276],[168,287],[183,69],[187,149],[193,225],[195,249],[220,119],[234,201],[239,215],[249,170],[268,306],[273,252],[279,173],[285,227],[308,273],[313,360],[319,43],[319,192],[360,196]];
//let raw = [[72,120],[79,272],[100,165],[101,194],[113,75],[115,242],[115,203],[123,202],[134,163],[136,167],[136,319],[150,206],[155,122],[160,207],[181,80],[181,304],[185,146],[192,223],[195,204],[222,82],[225,75],[236,85],[256,41],[264,186],[267,283],[268,213],[296,125],[304,264],[308,121],[313,165],[318,287],[336,187]];
//let raw = [[35,272],[37,325],[75,206],[77,81],[108,197],[115,200],[120,147],[132,321],[137,161],[152,174],[154,187],[166,339],[173,94],[189,288],[192,232],[206,365],[232,288],[247,191],[252,153],[254,357],[268,114],[271,172],[275,253],[309,237],[314,233],[317,169],[322,318],[336,210],[344,160],[375,152],[380,129],[380,327]];
//let raw = [[57,151],[99,227],[105,117],[106,319],[112,208],[115,166],[129,253],[130,319],[151,245],[170,214],[178,225],[182,169],[183,125],[189,63],[190,381],[192,108],[194,121],[201,188],[211,348],[211,298],[225,312],[226,191],[234,173],[245,230],[254,356],[267,216],[273,168],[274,223],[280,12],[285,192],[308,60],[352,207]];
//let raw = [[34,233],[63,23],[80,188],[94,209],[116,182],[126,212],[149,148],[151,306],[157,151],[170,327],[175,219],[177,149],[178,59],[179,269],[182,150],[189,73],[189,182],[206,165],[209,143],[216,131],[217,251],[225,180],[229,82],[229,98],[247,148],[247,202],[254,81],[260,164],[261,185],[282,386],[338,158],[357,330]];
//let raw = [[32,105],[51,60],[60,181],[93,119],[99,239],[113,135],[134,135],[137,386],[142,62],[159,118],[170,227],[170,215],[180,94],[186,163],[191,331],[192,69],[192,352],[195,84],[197,164],[201,263],[218,315],[219,138],[226,280],[229,248],[255,76],[266,290],[286,331],[304,230],[305,216],[330,132],[342,225],[379,236]];
//let raw = [[17,146],[27,321],[64,276],[80,203],[87,234],[109,337],[116,156],[128,327],[138,102],[142,328],[151,115],[153,311],[158,150],[163,132],[166,67],[184,181],[199,237],[204,191],[204,89],[225,64],[239,83],[244,113],[247,321],[259,131],[274,185],[280,275],[294,249],[319,203],[328,233],[367,205],[370,149],[371,151]];
//let raw = [[56,360],[79,189],[90,162],[101,130],[135,132],[141,240],[151,220],[155,112],[160,287],[170,139],[172,245],[176,148],[181,96],[189,266],[194,307],[198,183],[199,184],[210,102],[210,78],[221,122],[221,205],[229,179],[230,124],[246,88],[270,289],[280,210],[282,290],[283,251],[295,73],[326,179],[332,319],[347,180]];
//let raw = [[56,265],[88,240],[102,215],[119,159],[134,215],[140,188],[152,87],[176,143],[178,210],[181,93],[182,225],[194,238],[197,110],[204,250],[204,154],[218,170],[218,174],[229,333],[231,252],[243,197],[246,231],[249,201],[257,232],[268,114],[272,130],[290,146],[305,227],[307,220],[320,230],[322,150],[352,241],[365,237]];
//let raw = [[46,128],[57,314],[64,240],[92,311],[97,203],[103,193],[117,265],[124,202],[136,140],[151,147],[168,134],[183,283],[187,377],[187,330],[190,254],[196,231],[198,341],[205,169],[210,184],[213,212],[219,43],[224,180],[232,270],[249,307],[251,29],[273,80],[315,38],[330,288],[356,206],[359,163],[364,190],[372,112]];
//let raw = [[30,220],[39,214],[51,272],[79,140],[92,294],[113,276],[126,323],[131,66],[140,57],[151,306],[155,263],[165,100],[178,226],[190,59],[193,87],[197,250],[206,271],[209,212],[216,118],[231,234],[240,121],[252,175],[257,201],[261,382],[265,333],[277,286],[305,140],[313,180],[326,292],[333,126],[335,106],[394,157]];
//let raw = [[22,175],[65,159],[95,172],[111,153],[112,109],[141,175],[143,80],[155,343],[162,72],[165,223],[181,91],[183,176],[191,248],[192,106],[193,197],[205,136],[207,12],[211,227],[229,211],[242,261],[254,190],[256,244],[263,127],[264,166],[264,194],[277,353],[284,170],[298,100],[311,123],[323,181],[330,160],[334,189]];
//let raw = [[3,233],[3,232],[46,69],[95,377],[107,164],[108,94],[118,268],[131,311],[132,53],[140,177],[142,97],[143,123],[151,157],[161,76],[165,203],[193,189],[204,139],[221,161],[226,277],[227,262],[231,166],[231,214],[250,195],[251,261],[256,189],[256,138],[265,105],[295,91],[304,320],[352,214],[353,279],[353,203]];
//let raw = [[43,211],[60,124],[67,85],[73,160],[98,327],[101,154],[108,93],[114,129],[119,196],[120,254],[137,237],[143,157],[160,176],[166,293],[176,204],[180,230],[196,256],[206,165],[210,107],[212,317],[217,194],[219,183],[224,362],[229,192],[231,242],[247,313],[248,283],[256,183],[256,186],[277,210],[292,166],[342,271]];
let sites = raw.slice(0);
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
        if(e.compound){
            let plucked = e.points.find(d => d.site === site);
            plucked.mergeLine = e.mergeLine;
            return plucked;
        }
        else{
            return e;
        }
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
    var groupCirc = document.createElementNS("http://www.w3.org/2000/svg", 'g'); //Create a path in SVG's namespace
    var siteCirc = document.createElementNS("http://www.w3.org/2000/svg", 'circle'); //Create a path in SVG's namespace
    var siteText = document.createElementNS("http://www.w3.org/2000/svg", 'text'); //Create a path in SVG's namespace
    groupCirc.setAttribute('transform', `translate(${site.site[0]},${site.site[1]})`);
    //siteCirc.setAttribute("cx", site.site[0]); //Set path's data
    //siteCirc.setAttribute("cy", site.site[1]); //Set path's data
    siteCirc.setAttribute("r", 3); //Set path's data
    siteText.setAttribute("y", -3);
    siteText.textContent = site.site.join(",");
    siteCirc.style.fill = "#000"; //Set stroke colour
    groupCirc.setAttribute("class", "site");
    groupCirc.appendChild(siteCirc);
    groupCirc.appendChild(siteText);
    svg.appendChild(groupCirc);
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