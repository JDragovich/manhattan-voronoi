/**
 * Generate Voronoi points via a basic, naive algorithm. Takes any distance callback
 * 
 * @param {array} points 
 * @param {number} width 
 * @param {number} height 
 * @param {function} distanceCallback 
 */

function generateVoronoiPoints(points, width, height, distanceCallback){

    let colors = points.map(e =>{ return {point:e, color: new Array(3).fill(0).map(d => Math.ceil(Math.random() * 255))}})

    let imageData = new Array(width * height).fill(0).map((point, index) => {
        let coordinate = [index % height , Math.ceil(index / height)];
        let closest = colors.reduce((c,e) => {

            if(Array.isArray(c)){
                return c.every(d => distanceCallback(d.point, coordinate) < distanceCallback(e.point, coordinate) ) ? c : e;
            }
            else if(distanceCallback(c.point, coordinate) === distanceCallback(e.point, coordinate)){
                return [c,e];
            }
            else{
                return distanceCallback(c.point, coordinate) < distanceCallback(e.point, coordinate) ? c : e;
            }

        }, {point:[Infinity,Infinity]});

        return Array.isArray(closest) ? [0,0,0] : closest.color;
    });
    
    return imageData;
};

/**
 * Generate an L1 Voronoi diagram
 * 
 * @param {array} sitePoints 
 * @param {number} width 
 * @param {sunber} height 
 */

function generateL1Voronoi(sitePoints,width,height){

    // sort points by x axis, breaking ties with y
    let sites = sitePoints.sort((a,b)=>{
        if(a[0] !== b[0]){
            return a[0] - b[0];
        }
        else if(a[1] !== b[1]){
            return a[1] - b[1];
        }
        else {
            throw new Exception("Points cannot lie on a square...")
        }
    }).map(e => {return {site:e, bisectors:[]}});

    const findBisector = curryFindBisector(findL1Bisector, width, height);

    return recursiveSplit(sites, findBisector, width, height).map(site => {
        site.polygonPoints = site.bisectors.reduce((total, bisector, index, bisectors)=>{

            if(index === 0){

                //find a bisector on an edge if you have one
                let startBisector = bisectors.find(e => {
                    return e.points.some(e => isPointonEdge(e));
                }) || bisector;

                let startingPoints = startBisector.points;
                
                if(isPointonEdge(startingPoints[startingPoints.length - 1])){
                    startingPoints = startingPoints.reverse();
                }

                return {
                    points:startingPoints,
                    used:[startBisector]
                }; 
            }
            else{
                let last = total.points[total.points.length -1];
                
                let nextBisector = bisectors.filter(e => total.used.every(d => e !== d)).reduce((c,e) => {
                    
                    let eDistance = distance(last, e.points[0]) < distance(last, e.points[e.points.length - 1]) ? distance(last, e.points[0]) : distance(last, e.points[e.points.length - 1]);   
                    let cDistance = distance(last, c.points[0]) < distance(last, c.points[c.points.length - 1]) ? distance(last, c.points[0]) : distance(last, c.points[c.points.length - 1]);                       
                    
                    return eDistance < cDistance ? e : c;
                },{points:[[Infinity,Infinity]]});

                let nextPoints = nextBisector.points; 

                if(samePoint(nextPoints[nextPoints.length - 1], last)){
                    nextPoints = nextPoints.reverse();
                }

                nextPoints = nextPoints.filter(e => !samePoint(e,last));

                return {
                    points:[...total.points, ...nextPoints],
                    used: [...total.used, nextBisector]
                };
            }
        },{}).points;

        let head = site.polygonPoints[0];
        let tail = site.polygonPoints[site.polygonPoints.length - 1]

        if(isPointonEdge(head) && isPointonEdge(tail)){
            let cornerX = (head[0] === 0 || head[0] === width) ? head[0] : tail[0];
            let cornerY = (head[1] === 0 || head[1] === height) ? head[1] : tail[1];
            
            site.polygonPoints.push([cornerX, cornerY]);
        }

        site.d = `M ${ site.polygonPoints.map(e => e.join(" ")).join(" L")} Z`;

        return site;
    });

    function isPointonEdge(point) {
        return point[0] === 0 ||
               point[0] === width ||
               point[1] === 0 ||
               point[1] === height;
    }

}

function recursiveSplit(splitArray, findBisector, width, height){
    
    // if its got more than two points in it, split it recursively
    if(splitArray.length > 2){
        let splitPoint = (splitArray.length - splitArray.length % 2) / 2

        // merge the child diagrams
        let L = recursiveSplit(splitArray.slice(0,splitPoint), findBisector, width, height);
        let R = recursiveSplit(splitArray.slice(splitPoint), findBisector, width, height);

        
        // the current working sites
        let neightborArray = R.sort((a,b) => distance(L[L.length - 1].site,a.site) - distance(L[L.length - 1].site,b.site));
    
        let startingInfo = determineStartingBisector(L[L.length - 1], neightborArray[0], width, null, findBisector);

        let initialBisector = startingInfo.startingBisector;
        let initialR = startingInfo.nearestNeighbor;
        let initialL = startingInfo.w;

        let upStrokeArray = walkMergeLine(initialR, initialL, initialBisector, [width,height], true, null, [], findBisector);
        let downStrokeArray = walkMergeLine(initialR, initialL, initialBisector, [0,0], false, null, [], findBisector);

        // combine all teh merge arrays
        let mergeArray = [initialBisector, ...upStrokeArray, ...downStrokeArray];            

        mergeArray.forEach(bisector => {
            bisector.sites[0].bisectors = clearOutOrphans(bisector.sites[0], bisector.sites[1]);
            bisector.sites[1].bisectors = clearOutOrphans(bisector.sites[1], bisector.sites[0]);                

            bisector.sites.forEach(site => {
                site.bisectors.push(bisector);
            })
        });

        return [...L, ...R];    

    }

    // otherwise, determine te vertexes if its got two sites
    else if(splitArray.length === 2){
        let bisector = findBisector(...splitArray);
        splitArray.forEach(e => { e.bisectors.push(bisector) });
        return splitArray;
    }

    // if its got just one, just return it
    else{
        return splitArray;
    }
}

function walkMergeLine(currentR, currentL, currentBisector, currentCropPoint, goUp, crossedBorder = null, mergeArray = [], findBisector){
    
    if(
        !currentBisector.sites.every(e => e === currentR || e === currentL)
    ){

        currentBisector = findBisector(currentR,currentL);

        trimBisector(currentBisector, crossedBorder, currentCropPoint);
        
        mergeArray.push(currentBisector);
    }
    
    let cropLArray = currentL.bisectors
                        .map(e => {return {bisector:e, point:bisectorIntersection(currentBisector, e)}})
                        .filter(e => {
                            let hopTo = e.bisector.sites.find(d => d !== currentL);
                            return e.point && (goUp ? isNewBisectorUpward(hopTo, currentL, currentR) : !isNewBisectorUpward(hopTo, currentL, currentR)) && !samePoint(e.point, currentCropPoint);
                        })
                        .sort((a, b) => goUp ? a.point[1] - b.point[1] : b.point[1] - a.point[1]);
    
    let cropRArray = currentR.bisectors
                        .map(e => {return {bisector:e, point:bisectorIntersection(currentBisector, e)}})
                        .filter(e => {
                            let hopTo = e.bisector.sites.find(d => d !== currentR);
                            return e.point && (goUp ? isNewBisectorUpward(hopTo, currentR, currentL) : !isNewBisectorUpward(hopTo, currentR, currentL)) && !samePoint(e.point, currentCropPoint);
                        })
                        .sort((a, b) => goUp ? a.point[1] - b.point[1] : b.point[1] - a.point[1]);

    let cropL = cropLArray.length > 0 && cropLArray[0] !== currentBisector ? cropLArray[0] : {bisector:null, point:goUp ? [Infinity, Infinity] : [-Infinity, -Infinity]};
    let cropR = cropRArray.length > 0 && cropRArray[0] !== currentBisector ? cropRArray[0] : {bisector:null, point:goUp ? [Infinity, Infinity] : [-Infinity, -Infinity]};

    //if no intersection, we're done.
    if(
        (!cropL.bisector && !cropR.bisector) ||
        (cropL.point[0] === cropR.point[0] && cropL.point[1] === cropR.point[1])
    ){
        // if the final merge bisector is horizontal, check to see if there are orphans 
        let leftOrphan = checkForOphans(currentR, currentL, goUp, findBisector); 
        let rightOrphan = checkForOphans(currentL, currentR, goUp, findBisector);

        if( 
            leftOrphan 
        ){
            // remove trapped bisector
            leftOrphan.sites.forEach(site => {
                site.bisectors = site.bisectors.filter(e => e !== leftOrphan);
            });

            let hopTo = findHopTo(leftOrphan, currentL);

            currentR = findCorrectW(currentR, hopTo, findBisector);                        
            let newMergeBisector = findBisector(hopTo, currentR);

            mergeArray.push(newMergeBisector);

            return walkMergeLine(currentR, hopTo, newMergeBisector, currentCropPoint, goUp, crossedBorder, mergeArray, findBisector);

        }
        else if(
            rightOrphan
        ){
            // remove trapped bisector
            rightOrphan.sites.forEach(site => {
                site.bisectors = site.bisectors.filter(e => e !== rightOrphan);
            });

            let hopTo = findHopTo(rightOrphan, currentR);

            currentL = findCorrectW(currentL, hopTo, findBisector);                        
            let newMergeBisector = findBisector(hopTo, currentL);
            
            mergeArray.push(newMergeBisector);                        

            return walkMergeLine(hopTo, currentL, newMergeBisector, currentCropPoint, goUp, crossedBorder, mergeArray, findBisector);
        }
        
        return mergeArray;
    }

    if(Math.abs(cropR.point[1] - currentCropPoint[1]) < Math.abs(cropL.point[1] - currentCropPoint[1]) && Math.abs(cropR.point[1] - currentCropPoint[1]) !== 0){
        trimBisector(cropR.bisector, currentBisector, cropR.point);
        trimBisector(currentBisector, cropR.bisector, cropR.point);
        currentBisector.intersections.push(cropR.point);
        crossedBorder = cropR.bisector;
        currentR = cropR.bisector.sites.find(e => e !== currentR);
        currentCropPoint = cropR.point;               
    }
    else if(Math.abs(cropR.point[1] - currentCropPoint[1]) > Math.abs(cropL.point[1] - currentCropPoint[1])){
        trimBisector(cropL.bisector, currentBisector, cropL.point);
        trimBisector(currentBisector, cropL.bisector, cropL.point);
        currentBisector.intersections.push(cropL.point);
        crossedBorder = cropL.bisector;
        currentL = cropL.bisector.sites.find(e => e !== currentL);
        currentCropPoint = cropL.point;                                       
    }
    else{
        console.warn("crop points are equal...");
    }

    return walkMergeLine(currentR, currentL, currentBisector, currentCropPoint, goUp, crossedBorder, mergeArray, findBisector);            
    
}

//determine starting bisector
function determineStartingBisector(w, nearestNeighbor, width, lastIntersect = null, findBisector){
    
    let z = [width, w.site[1]];
    
    if(!lastIntersect){
        lastIntersect = w.site;
    }

    let zline = {points:[w.site,z]};

    let intersection = nearestNeighbor.bisectors.map(bisector => {
        return {point:bisectorIntersection(zline,bisector), bisector:bisector}
    }).find(intersection => intersection.point);
    
    if(intersection && distance(w.site, intersection.point) > distance(nearestNeighbor.site, intersection.point)){
        var startingBisector = findBisector(w, nearestNeighbor);
        return {
            startingBisector: startingBisector,
            w:w,
            nearestNeighbor: nearestNeighbor,
            startingIntersection: intersection.point ? intersection.point : w.site
        };
    }
    else if(intersection && distance(w.site, intersection.point) < distance(nearestNeighbor.site, intersection.point) && intersection.point[0] > lastIntersect[0] ){
        let nextR = intersection.bisector.sites.find(e => e !== nearestNeighbor);
        return determineStartingBisector(w, nextR, width, intersection.point, findBisector);
    }
    else{
        w = findCorrectW(w,nearestNeighbor, findBisector);
        
        let startingBisector = findBisector(w, nearestNeighbor);

        return {
            startingBisector: startingBisector,
            w:w,
            nearestNeighbor: nearestNeighbor,
            startingIntersection: intersection ? intersection.point : w.site
        };

    }

};

function findCorrectW(w, nearestNeighbor, findBisector){
    
    var startingBisector = findBisector(w, nearestNeighbor);        

    let wTrap = w.bisectors.map(e => {
        let hopTo = findHopTo(e,w);
        return {hopTo:hopTo, isTrapped:isBisectorTrapped(hopTo,startingBisector)}
    })
    .filter(e => e.isTrapped)
    .sort((a,b) => distance(a.hopTo.site,nearestNeighbor.site) - distance(b.hopTo.site, nearestNeighbor.site))[0];

    if(wTrap){
        return findCorrectW(wTrap.hopTo, nearestNeighbor, findBisector);
    }
    else{
        return w;
    }
}

// function that recursivly checks for orphaned besectors
function checkForOphans(trapper, trapped, goUp, findBisector){
    
    return trapped.bisectors.filter(bisector => {
        let hopTo = findHopTo(bisector, trapped);
        return goUp === hopTo.site[1] < trapped.site[1] && isBisectorTrapped(trapper,bisector); 
    }).sort((a,b) => {

        let hopToA = findHopTo(a, trapped);
        let hopToB = findHopTo(b, trapped);

        let mergeLineA = findBisector(hopToA, trapper);
        let mergeLineB = findBisector(hopToB, trapper);

        let extremeA = getExtremePoint(mergeLineA, goUp);
        let extremeB = getExtremePoint(mergeLineB, goUp);
        
        return goUp ? extremeB - extremeA : extremeA - extremeB;
    })[0];
    
}

function curryFindBisector(callback, width, height){
    return function(P1, P2){
        return callback(P1, P2, width, height);
    }
}

function findL1Bisector(P1, P2, width, height){
    
    
    let xDistance = P1.site[0] - P2.site[0];
    let yDistance = P1.site[1] - P2.site[1];

    let midpoint = [
        (P1.site[0] + P2.site[0]) / 2,
        (P1.site[1] + P2.site[1]) / 2
    ];

    let slope = yDistance/xDistance > 0 ? -1 : 1;

    let intercetpt = midpoint[1] - midpoint[0] * slope;

    let vertexes = [];
    let up = null;
    
    if(Math.abs(xDistance) > Math.abs(yDistance)){
        vertexes = [
            [(P1.site[1] - intercetpt) / slope, P1.site[1]],
            [(P2.site[1] - intercetpt) / slope, P2.site[1]]
        ];

        up = true;
    }
    else{
        vertexes = [
            [P1.site[0] , (P1.site[0] * slope) + intercetpt ],
            [P2.site[0] , (P2.site[0] * slope) + intercetpt ]
        ];

        up = false;
    }

    let bisector = {sites:[P1, P2], up:up, points:[], intersections:[]};

    if(up){
        let sortedVerts = vertexes.sort((a,b) => a[1] - b[1]);
        bisector.points.unshift(
            [sortedVerts[0][0], 0]
        );
    }
    else{
        let sortedVerts = vertexes.sort((a,b) => a[0] - b[0]);            
        bisector.points.unshift(
            [0,sortedVerts[0][1]]    
        );
    }
    
    bisector.points.push(...vertexes);

    if(up){
        let sortedVerts = vertexes.sort((a,b) => a[1] - b[1]);
        bisector.points.push(
            [sortedVerts[1][0], height]
        );
    }
    else{
        let sortedVerts = vertexes.sort((a,b) => a[0] - b[0]);
        bisector.points.push(
            [width,sortedVerts[1][1]]    
        );
    }

    return bisector;
}

// clear out orphans when a new merge line is created
function clearOutOrphans(orphanage, trapPoint){
    return orphanage.bisectors.filter(bisector => !isBisectorTrapped(trapPoint, bisector));
}

function findHopTo(bisector, hopFrom){
    return bisector.sites.find(e => e !== hopFrom);
}

function distance(P1, P2){
    return Math.abs(P1[0] - P2[0]) + Math.abs(P1[1] - P2[1]);
}

function isBisectorTrapped(trapPoint, bisector){
    return bisector.points.every(point => distance(trapPoint.site, point) < distance(bisector.sites[0].site, point) && distance(trapPoint.site, point) < distance(bisector.sites[1].site, point));
}

// find the highest or lowest point of a potential bisector.
function getExtremePoint(bisector, goUp){
    return bisector.points.reduce((c,e)=>{
        return goUp ? Math.max(e[1],c) : Math.min(e[1],c);
    }, goUp ? -Infinity : Infinity);
}

function trimBisector(target, intersector, intersection){
    
    let polygonSite = intersector.sites.find(e => target.sites.find(d => d === e) === undefined);

    let newPoints = target.points.filter(e => {
        return distance(e, target.sites[0].site) < distance(e, polygonSite.site) && distance(e, target.sites[1].site) < distance(e, polygonSite.site);
    });

    newPoints.push(intersection);

    target.points = newPoints.sort((a,b) => {
        if(target.up){
            return a[1] - b[1];
        }
        else{
            return a[0] - b[0];
        }
    });

};

function isNewBisectorUpward(hopTo, hopFrom, site){
    
    let slope = (hopTo.site[1] - site.site[1])/(hopTo.site[0] - site.site[0]);
    let intercept = hopTo.site[1] - (slope * hopTo.site[0]);

    let isAboveLine = hopFrom.site[1] > (slope * hopFrom.site[0]) + intercept;
    
    return isAboveLine;
}

function bisectorIntersection(B1, B2){
    if(B1 === B2){
        return false;
    }

    for(let i = 0; i < B1.points.length - 1; i++){
        for(let j = 0; j < B2.points.length - 1; j++){
            let intersect = segementIntersection([B1.points[i], B1.points[i+1]], [B2.points[j], B2.points[j+1]], i, j);

            if(intersect){
                return intersect;
            }
        }
    }

    return false;
}

function segementIntersection(L1, L2, i, j){
    
    var ua, ub, denom = (L2[1][1] - L2[0][1])*(L1[1][0] - L1[0][0]) - (L2[1][0] - L2[0][0])*(L1[1][1] - L1[0][1]);
    
    // if denom is zero, that mean that both segemnts are verticle or horizontal, and we need to account for that.
    if (denom == 0) {
        return null;
    }
    ua = ((L2[1][0] - L2[0][0])*(L1[0][1] - L2[0][1]) - (L2[1][1] - L2[0][1])*(L1[0][0] - L2[0][0]))/denom;
    ub = ((L1[1][0] - L1[0][0])*(L1[0][1] - L2[0][1]) - (L1[1][1] - L1[0][1])*(L1[0][0] - L2[0][0]))/denom;

    if(
        !(ua >= 0 && ua <= 1 &&
        ub >= 0 && ub <= 1)
    ){
        return false;
    }

    return [
        L1[0][0] + ua*(L1[1][0] - L1[0][0]),
        L1[0][1] + ua*(L1[1][1] - L1[0][1])
    ];

}

function samePoint(P1, P2){
    return P1[0] === P2[0] && P1[1] === P2[1];
}


export {generateVoronoiPoints, generateL1Voronoi};
