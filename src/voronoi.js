/**
 * Generate Voronoi points via a basic, naive algorithm. Takes any distance callback
 * 
 * @param {array} points 
 * @param {number} width 
 * @param {number} height 
 * @param {function} distanceCallback
 * @returns {Array<Site>} 
 */

function generateVoronoiPoints(points, width, height, distanceCallback){

    let colors = points.map(e =>{ return {point:e, color: new Array(3).fill(0).map(d => Math.ceil(Math.random() * 255))}})

    let imageData = new Array(width * height).fill(0).map((point, index) => {
        let coordinate = [index % height , Math.ceil(index / height)];
        let closest = colors.reduce((c,e)=>{
            let distance = distanceCallback(coordinate, e.point);
            return distance <= c.distance ? {site:e, distance:distance, dup:distance === c.distance} : c;
        },{site:null, distance:Infinity, dup:false});

        return closest.dup ? [0,0,0] : closest.site.color;
    });
    
    return imageData;
};

/**
 * Generate an L1 Voronoi diagram
 * 
 * @param {array} sitePoints 
 * @param {number} width 
 * @param {number} height
 * @returns {Array<Site>} 
 */

function generateL1Voronoi(sitePoints,width,height){

    // sort points by x axis, breaking ties with y
    let sites = sitePoints.sort((a,b)=>{
        if(a[0] !== b[0]){
            return a[0] - b[0];
        }
        else{
            return a[1] - b[1];
        }
    }).map(e => {return {site:e, bisectors:[]}});

    const findBisector = curryFindBisector(findL1Bisector, width, height);
    const graph = recursiveSplit(sites, findBisector, width, height);
    console.log(graph);
    return graph;
    /*
    return graph.map(site => {
        //console.log(site);

        let filteredBisectors = site.bisectors.map(e => {
            return !e.compound ?
                   e :
                   e.points.find(d => d.site === site);
        })

        site.polygonPoints = filteredBisectors.reduce((total, bisector, index, bisectors)=>{

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
    */

    function isPointonEdge(point) {
        return point[0] === 0 ||
               point[0] === width ||
               point[1] === 0 ||
               point[1] === height;
    }

}

/**
 * Recursivly split and merge sets of points
 * 
 * @param {Array} splitArray 
 * @param {function} findBisector 
 * @param {Number} width 
 * @param {Number} height
 * @returns {Array<Site>}
 */
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

        console.log(`%c starting ${R.length * 2} upstroke`, "background:#133468; color:#FFFF");
        let upStrokeArray = walkMergeLine(initialR, initialL, initialBisector, [width,height], true, null, [], findBisector);
        console.log(`%c starting ${R.length * 2} downstroke`, "background:#133468; color:#FFFF");        
        let downStrokeArray = walkMergeLine(initialR, initialL, initialBisector, [0,0], false, null, [], findBisector);

        // combine all teh merge arrays
        let mergeArray = [initialBisector, ...upStrokeArray, ...downStrokeArray];            

        mergeArray.forEach(bisector => {
            bisector.mergeLine = splitArray.length;
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
        //console.log(bisector);
        splitArray.forEach(e => { e.bisectors.push(bisector) });
        return splitArray;
    }

    // if its got just one, just return it
    else{
        return splitArray;
    }
}

/**
 * 
 * @param {Site} currentR 
 * @param {Site} currentL 
 * @param {Bisector} currentBisector 
 * @param {Array} currentCropPoint 
 * @param {Boolean} goUp 
 * @param {Bisector} crossedBorder 
 * @param {Array} mergeArray - Array of Bisectors 
 * @param {function} findBisector
 * @returns {Array<Bisector>} 
 */
function walkMergeLine(currentR, currentL, currentBisector, currentCropPoint, goUp, crossedBorder = null, mergeArray = [], findBisector){
    
    if(
        !currentBisector.sites.every(e => e === currentR || e === currentL)
    ){

        currentBisector = findBisector(currentR,currentL);

        trimBisector(currentBisector, crossedBorder, currentCropPoint, true);
        
        mergeArray.push(currentBisector);
    }
    
    let cropLArray = currentL.bisectors
                        .map(e => {
                            //console.log(bisectorIntersection(currentBisector, e, currentCropPoint))
                            return {
                                bisector:e, 
                                point:bisectorIntersection(currentBisector, e, currentCropPoint) || 
                                      (distance(currentCropPoint, e.sites[0].site) === distance(currentCropPoint, e.sites[1].site) ? currentCropPoint: false),
                                      overrideSamePoint: distance(currentCropPoint, e.sites[0].site) === distance(currentCropPoint, e.sites[1].site) && e.compound
                                
                            }
                        })
                        .filter(e => {
                            let hopTo = e.bisector.sites.find(d => d !== currentL);
                            //console.log("left bisector", JSON.stringify(e.bisector.sites.map(d => d.site)), e.point);
                            //console.log(e.point, goUp, isNewBisectorUpward(hopTo, currentL, currentR, goUp), (!samePoint(e.point, currentCropPoint) || e.overrideSamePoint))
                            return e.point && 
                                   (goUp === isNewBisectorUpward(hopTo, currentL, currentR, goUp)) && 
                                   (!samePoint(e.point, currentCropPoint) || e.overrideSamePoint);
                        })
                        .sort((a, b) => {
                            if(samePoint(a.point,b.point)){
                                console.log("corner problem Left")
                                //console.log(angle(currentL.site, findHopTo(b.bisector, currentL).site), angle(currentL.site, findHopTo(a.bisector, currentL).site) )
                                return angle(currentL.site, findHopTo(b.bisector, currentL).site) - angle(currentL.site, findHopTo(a.bisector, currentL).site)
                            }
                            return angle(currentL.site, findHopTo(b.bisector, currentL).site) - angle(currentL.site, findHopTo(a.bisector, currentL).site)                            
                            //return goUp ? a.point[1] - b.point[1] : b.point[1] - a.point[1];
                        })
                        .filter((e, i, candidates) => {
                            // this filtering function is messy and gross gotta break this up
                            let hopTo = findHopTo(e.bisector, currentL);
                            let newMergeLine = findBisector(currentR, hopTo);
                            trimBisector(newMergeLine, e.bisector, e.point);
                            console.log("left", e, willMergeLineEscapeTheDesert(e,currentBisector,currentL,currentR,currentCropPoint, findBisector)); 
                            return candidates.every(d => !isBisectorTrapped(findHopTo(d.bisector, currentL), newMergeLine) || findHopTo(d.bisector, currentL) === hopTo) &&
                            willMergeLineEscapeTheDesert(e,currentBisector,currentL,currentR,currentCropPoint, findBisector);
                        });
    
    let cropRArray = currentR.bisectors
                        .map(e => {
                            return {
                                bisector:e, 
                                point:bisectorIntersection(currentBisector, e, currentCropPoint) || 
                                      (distance(currentCropPoint, e.sites[0].site) === distance(currentCropPoint, e.sites[1].site) ? currentCropPoint : false),
                                overrideSamePoint: distance(currentCropPoint, e.sites[0].site) === distance(currentCropPoint, e.sites[1].site) && e.compound
                            }
                        })
                        .filter(e => {
                            let hopTo = e.bisector.sites.find(d => d !== currentR);
                            //console.log("right bisector", JSON.stringify(e.bisector.sites.map(d => d.site)), e.point);
                            return e.point && 
                                   (goUp === isNewBisectorUpward(hopTo, currentR, currentL, goUp)) && 
                                   (!samePoint(e.point, currentCropPoint) || e.overrideSamePoint);
                        })
                        .sort((a, b) => {
                            if(samePoint(a.point,b.point)){
                                console.log("corner problem Right");
                                //console.log(findHopTo(a.bisector,currentR),checkForOphans(currentL, findHopTo(a.bisector,currentR), goUp, findBisector), checkForOphans(currentL, findHopTo(b.bisector,currentR), goUp, findBisector))
                                return angle(currentR.site, findHopTo(a.bisector, currentR).site) - angle(currentR.site, findHopTo(b.bisector, currentR).site)
                            }
                            return angle(currentR.site, findHopTo(a.bisector, currentR).site) - angle(currentR.site, findHopTo(b.bisector, currentR).site)                            
                            //return goUp ? a.point[1] - b.point[1] : b.point[1] - a.point[1];
                        })
                        .filter((e, i, candidates) => {
                            let hopTo = findHopTo(e.bisector, currentR);
                            let newMergeLine = findBisector(currentL, hopTo);
                            trimBisector(newMergeLine, e.bisector, e.point);
                            if(currentBisector.compound){
                                console.log("right", e, willMergeLineEscapeTheDesert(e,currentBisector,currentL,currentR,currentCropPoint, findBisector)); 
                            }
                            return candidates.every(d => !isBisectorTrapped(findHopTo(d.bisector, currentR), newMergeLine) || findHopTo(d.bisector, currentR) === hopTo) &&
                            willMergeLineEscapeTheDesert(e,currentBisector,currentR,currentL,currentCropPoint, findBisector);
                        });

    let cropL = cropLArray.length > 0 && cropLArray[0] !== currentBisector ? cropLArray[0] : {bisector:null, point:goUp ? [Infinity, Infinity] : [-Infinity, -Infinity]};
    let cropR = cropRArray.length > 0 && cropRArray[0] !== currentBisector ? cropRArray[0] : {bisector:null, point:goUp ? [Infinity, Infinity] : [-Infinity, -Infinity]};
    console.log(
        cropLArray, 
        cropRArray, 
        goUp, 
        currentL.site, 
        currentR.site, 
        checkForOphans(currentR, currentL, goUp, findBisector), 
        checkForOphans(currentL, currentR, goUp, findBisector)
    );                    
    
    // If the final merge bisector is horizontal, check to see if there are orphans 
    let leftOrphan = checkForOphans(currentR, currentL, goUp, findBisector); 
    let rightOrphan = checkForOphans(currentL, currentR, goUp, findBisector);

    // if there is absolutly nothing, we're one
    if(
        !leftOrphan && 
        !rightOrphan &&
        !cropL.bisector &&
        !cropR.bisector
    ){
        return mergeArray;            
    }
    
    if(
        (!cropL.bisector && !cropR.bisector)
    ){
        if( 
            leftOrphan 
        ){
            // Remove trapped bisector
            leftOrphan.sites.forEach(site => {
                site.bisectors = site.bisectors.filter(e => e !== leftOrphan);
            });

            let hopTo = findHopTo(leftOrphan, currentL);

            currentR = findCorrectW(currentR, hopTo, findBisector);                        
            let newMergeBisector = findBisector(hopTo, currentR);

            mergeArray.push(newMergeBisector);

            currentR.bisectors.forEach(e => trimBisector(newMergeBisector, e));
            hopTo.bisectors.forEach(e => trimBisector(newMergeBisector, e));

            return walkMergeLine(currentR, hopTo, newMergeBisector, currentCropPoint, goUp, currentBisector, mergeArray, findBisector);

        }
        else if(
            rightOrphan
        ){
            // Remove trapped bisector
            console.log("right orphan", rightOrphan.sites.map(e => JSON.stringify(e.site)));
            rightOrphan.sites.forEach(site => {
                site.bisectors = site.bisectors.filter(e => e !== rightOrphan);
            });

            let hopTo = findHopTo(rightOrphan, currentR);

            currentL = findCorrectW(currentL, hopTo, findBisector);                        
            let newMergeBisector = findBisector(hopTo, currentL);
            
            mergeArray.push(newMergeBisector);
            
            hopTo.bisectors.forEach(e => trimBisector(newMergeBisector, e));
            currentL.bisectors.forEach(e => trimBisector(newMergeBisector, e));

            return walkMergeLine(hopTo, currentL, newMergeBisector, currentCropPoint, goUp, currentBisector, mergeArray, findBisector);
        }
        
    }

    if(Math.abs(cropR.point[1] - currentCropPoint[1]) < Math.abs(cropL.point[1] - currentCropPoint[1])){
        //console.log('right first', cropR, currentBisector);
        trimBisector(currentBisector, cropR.bisector, cropR.point);
        trimBisector(cropR.bisector, currentBisector, cropR.point);
        currentR.bisectors.filter(e => e.compound).forEach(d => trimBisector(d, currentBisector));
        //currentBisector.intersections.push(cropR.point);
        crossedBorder = cropR.bisector;
        currentR = cropR.bisector.sites.find(e => e !== currentR);
        currentCropPoint = cropR.point;               
    }
    else if(Math.abs(cropR.point[1] - currentCropPoint[1]) > Math.abs(cropL.point[1] - currentCropPoint[1])){
        //console.log('left first', currentBisector, currentL.bisectors.filter(e => e.compound));
        trimBisector(currentBisector, cropL.bisector, cropL.point);
        trimBisector(cropL.bisector, currentBisector, cropL.point);
        currentL.bisectors.filter(e => e.compound).forEach(d => trimBisector(d, currentBisector));        
        //currentBisector.intersections.push(cropL.point);
        crossedBorder = cropL.bisector;
        currentL = cropL.bisector.sites.find(e => e !== currentL);
        currentCropPoint = cropL.point;                                       
    }
    else{
        console.log("double moving on...");
        trimBisector(currentBisector, cropR.bisector, cropR.point);
        trimBisector(cropR.bisector, currentBisector, cropR.point);
        currentR.bisectors.filter(e => e.compound).forEach(d => trimBisector(d, currentBisector));        
        currentL.bisectors.filter(e => e.compound).forEach(d => trimBisector(d, currentBisector));

        //currentBisector.intersections.push(cropR.point);
        crossedBorder = cropR.bisector;
        currentR = cropR.bisector.sites.find(e => e !== currentR);
        currentCropPoint = cropR.point;

        trimBisector(currentBisector, cropL.bisector, cropL.point);
        trimBisector(cropL.bisector, currentBisector, cropL.point);
        //currentBisector.intersections.push(cropL.point);
        crossedBorder = cropL.bisector;
        currentL = cropL.bisector.sites.find(e => e !== currentL);
        currentCropPoint = cropL.point;
    }

    currentR.bisectors.forEach(e => trimBisector(currentBisector, e));
    currentL.bisectors.forEach(e => trimBisector(currentBisector, e));

    return walkMergeLine(currentR, currentL, currentBisector, currentCropPoint, goUp, crossedBorder, mergeArray, findBisector);            
    
}

function willMergeLineEscapeTheDesert(crossedBorder, currentMergeLine, currentSide, otherside, currentCropPoint, findBisector){
    let hopTo = findHopTo(crossedBorder.bisector, currentSide);

    // first off, if the crossed border is not compound, the meger line will secape the desert
    if(!crossedBorder.bisector.compound){
        //console.log('crossed border is not compound');
        return true;
    }
    // also if it is compound, but the merge line crosses both branches, then it will escape the desert
    else if(
        crossedBorder.bisector.points.every(e => bisectorIntersection(e,currentMergeLine, currentCropPoint))
    ){
        //console.log('crossed both borders');
        return true;
    }
    // however if we start in the desert and cross a border, we know it escapes
    // TODO: need to figure out how to account for a compount mergeline...
    else if(
        currentMergeLine.points.some(e => distance(e, hopTo.site) < distance(e,currentSide.site)) 
    ){
        return true;
    }
    else if(
        currentMergeLine.compound &&
        currentMergeLine.points.some(d => d.points.some(e => distance(e, hopTo.site) < distance(e,currentSide.site)))
    ){    
        return true;
    }
    
    // if all else fails, determine if the merge line would cross into anoth polygo if it were to continue
    else{
        //console.log("checking to see if it will enter another polycgon")
        let newMergeLine = findBisector(otherside, hopTo);
        trimBisector(newMergeLine, crossedBorder.bisector, crossedBorder.point);
        let rightIntersections = hopTo.bisectors.some(d => bisectorIntersection(newMergeLine, d, currentCropPoint) && d !== crossedBorder.bisector);
        //let leftIntersections = otherside.bisectors.some(d => bisectorIntersection(newMergeLine, d, currentCropPoint) && d !== crossedBorder.bisector);
        //console.log("home intersections",rightIntersections, "otherside intersections",leftIntersections)
        return rightIntersections //|| leftIntersections;
    }
}

function isMergeLineTrappedInTheDesert(candidate, othersideCurrent, crossedBorder){
    let candidateMergeLine = findBisector(candidate, othersideCurrent);
    
    return
}

function angle(P1, P2){
    let angle = Math.atan2(P2[1] - P1[1], P2[0] - P1[0]);

    if(angle < 0){
        angle = Math.PI + Math.PI + angle; 
    }

    return angle;
}

/**
 * determine starting bisector for the merge process
 * 
 * @param {Array} w - starting point in form [x, y] 
 * @param {Array} nearestNeighbor point in form [x, y]
 * @param {number} width 
 * @param {Array} lastIntersect point in form [x,y] 
 * @param {function} findBisector  
 */
function determineStartingBisector(w, nearestNeighbor, width, lastIntersect = null, findBisector){
    
    let z = [width, w.site[1]];
    
    if(!lastIntersect){
        lastIntersect = w.site;
    }

    let zline = {points:[w.site,z], compound:false};

    let intersections = nearestNeighbor.bisectors.map(bisector => {
        return {point:bisectorIntersection(zline,bisector, w.site), bisector:bisector}
    })
    .filter(intersection => intersection.point)
    .sort((a,b) => a.point[0] - b.point[0]);

    let intersection = intersections.length > 0 ? intersections[0] : null;
    
    // need to check if it gets trapped in a desert 
    let willEscape = true;

    if(intersection && intersection.bisector.compound){
        console.log(intersection.bisector);
        
        willEscape = willMergeLineEscapeTheDesert(
            intersection,
            findBisector(w, nearestNeighbor),
            nearestNeighbor,
            w,
            intersection.point,
            findBisector
        );
    }


    if(
        intersection && 
        distance(w.site, intersection.point) > distance(nearestNeighbor.site, intersection.point) &&
        willEscape
    ){
        var startingBisector = findBisector(w, nearestNeighbor);
        return {
            startingBisector: startingBisector,
            w:w,
            nearestNeighbor: nearestNeighbor,
            startingIntersection: intersection.point ? intersection.point : w.site
        };
    }
    else if(
        intersection && 
        distance(w.site, intersection.point) < distance(nearestNeighbor.site, intersection.point) && 
        intersection.point[0] > lastIntersect[0] &&
        willEscape
    ){
        console.log("less than", intersection.point[0], lastIntersect[0]);
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

/**
 * Ensure that the starting point is correct and would not result in a trapped bisector
 * 
 * @param {Array} w in form [x,y] 
 * @param {Array} nearestNeighbor in form [x,y]
 * @param {function} findBisector
 * @returns {Array} in form [x,y] 
 */
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

/**
 * Function that recursivly checks for orphaned besectors
 * 
 * @param {Site} trapper 
 * @param {Site} trapped 
 * @param {boolean} goUp 
 * @param {function} findBisector 
 */
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

/**
 * Currys find bisector function with the current width, height
 * 
 * @param {function} callback 
 * @param {number} width 
 * @param {number} height
 * @return {function} 
 */
function curryFindBisector(callback, width, height){
    return function(P1, P2){
        return callback(P1, P2, width, height);
    }
}

/**
 * Generate L1 bisector between two sites
 * 
 * @param {Site} P1 
 * @param {Site} P2 
 * @param {number} width 
 * @param {number} height
 * @returns {bisector} 
 */
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
    
    // special case 
    if(Math.abs(xDistance) === Math.abs(yDistance)){
        console.warn("square bisector");
        
        let internalPoints = [
            [(P1.site[1] - intercetpt) / slope, P1.site[1]],
            [(P2.site[1] - intercetpt) / slope, P2.site[1]]
        ];

        let byHeight = [P1,P2].sort((a,b) => a.site[1] - b.site[1]);
        let sortedVerts = internalPoints.sort((a,b) => a[1] - b[1]);
        
        vertexes = [
            {
                site:byHeight[0],
                sites:[P1, P2],
                points:[
                    [sortedVerts[0][0],0],
                    ...sortedVerts,
                    [slope === -1 ? 0 : width, sortedVerts[1][1]]
                ],
                compound:false,
                compoundComponent:true,
                intersections:[]
            },
            {
                site:byHeight[1],
                sites:[P1, P2],
                points:[
                    [slope === -1 ? width : 0, sortedVerts[0][1]],
                    ...sortedVerts,
                    [sortedVerts[1][0], height]
                ],
                compound:false,
                compoundComponent:true,                
                intersections:[]
            }
        ];


        return {sites:[P1, P2], up:true, points:vertexes, intersections:[], compound:true};        
    }
    

    
    if(Math.abs(xDistance) === 0){
        vertexes = [
            [0, midpoint[1]],
            [width, midpoint[1]]
        ];

        return {sites:[P1, P2], up:false, points:vertexes, intersections:[], compound:false};
    }

    if(Math.abs(yDistance) === 0){
        vertexes = [
            [midpoint[0], 0],
            [midpoint[0], height]
        ];

        return {sites:[P1, P2], up:true, points:vertexes, intersections:[], compound:false};
    }
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

    let bisector = {sites:[P1, P2], up:up, points:[], intersections:[], compound:false};    

    if(up){
        const sortedVerts = vertexes.sort((a,b) => a[1] - b[1]);

        
        bisector.points = [
            [sortedVerts[0][0], 0],
            ...sortedVerts,
            [sortedVerts[1][0], height] 
        ].sort((a,b) => a[1] - b[1]);
        
    }
    else{
        const sortedVerts = vertexes.sort((a,b) => a[0] - b[0]);            
        
        bisector.points = [
            [0,sortedVerts[0][1]],
            ...sortedVerts,
            [width,sortedVerts[1][1]]
        ].sort((a,b) => a[0] - b[0]);
    }

    //console.log(bisector.points.length);
    return bisector;
}

/**
 * Clear out orphans when a new merge line is created
 * 
 * @param {Site} orphanage 
 * @param {Site} trapPoint
 * @returns {Array<Bisector>} 
 */
function clearOutOrphans(orphanage, trapPoint){
    return orphanage.bisectors.filter(bisector => !isBisectorTrapped(trapPoint, bisector));
}

/**
 * Finds other point across a bisector
 * 
 * @param {Bisector} bisector 
 * @param {Site} hopFrom
 * @returns {Site} 
 */
function findHopTo(bisector, hopFrom){
    return bisector.sites.find(e => e !== hopFrom);
}


/**
 * Find L1 distance
 * 
 * @param {Array} P1 in form [x,y] 
 * @param {Array} P2 in form [x,y]
 * @returns {number}
 */
function distance(P1, P2){
    return Math.abs(P1[0] - P2[0]) + Math.abs(P1[1] - P2[1]);
}

/**
 * Determine if bisector is trapped in a site's polygon
 * Trapped is defined as all the points of a bisector being closer to the trap point than either if its own sites.
 * 
 * @param {Site} trapPoint 
 * @param {Bisector} bisector
 * @returns {boolean} 
 */
function isBisectorTrapped(trapPoint, bisector){
    if(!bisector.compound){
        return bisector.points.every(point => distance(trapPoint.site, point) <= distance(bisector.sites[0].site, point) && distance(trapPoint.site, point) <= distance(bisector.sites[1].site, point)) &&
               bisector.points.some(point => distance(trapPoint.site, point) < distance(bisector.sites[0].site, point) && distance(trapPoint.site, point) < distance(bisector.sites[1].site, point));    
    }
    else{
        return isBisectorTrapped(trapPoint, bisector.points[0]) && isBisectorTrapped(trapPoint, bisector.points[1]);
    }
}

/**
 * Find the highest or lowest point of a potential bisector.
 * 
 * @param {Bisector} bisector 
 * @param {boolean} goUp 
 */
function getExtremePoint(bisector, goUp){
    if(!bisector.compound){
        return bisector.points.reduce((c,e)=>{
            return goUp ? Math.max(e[1],c) : Math.min(e[1],c);
        }, goUp ? -Infinity : Infinity);
    }
    else{
        return bisector.points.map(e => {
            return getExtremePoint(e, goUp);        
        })
        .sort((a,b) => {
            return goUp ? a[1] - b[1] : b[1] - a[1];
        });
    }
}

/**
 * Trim a bisector at a particular point, discarding the points lying within the other polygon
 * 
 * @param {Bisector} target 
 * @param {Bisector} intersector 
 * @param {Array} intersection in form [x,y] 
 */
function trimBisector(target, intersector, passedIntersection, backtrim){

    if(!target.compound && !intersector.compound){

        let intersection = bisectorIntersection(target, intersector);

        if(!intersection){
            //console.log(intersection, target, intersector); 
            return; 
        }
        
        let newPoints = target.points.reduce((c, e, i, array)=> {
            if(i + 1 >= array.length){
                return c;
            }

            if(distance(e, intersection) + distance(array[i+1], intersection) === distance(e, array[i+1]) &&
               !samePoint(e, intersection) &&
               !samePoint(array[i+1], intersection)){
                return [...c, e, intersection];
            }
            else{
                return [...c, e];
            }
        },[]);
       
        // add the last one
        newPoints = [...newPoints, target.points[target.points.length - 1]];

        target.intersections.push(intersection)
        
        target.points = newPoints.filter(e => {

            let targetShortestDistance, intersectorShortestDistance;
            // old triming
            if(target.compoundComponent){
                targetShortestDistance = distance(e, target.site.site);
            }
            else{
                targetShortestDistance = Math.min(...target.sites.map(d => distance(e, d.site)));    
            }

            if(intersector.compoundComponent){
                intersectorShortestDistance = distance(e, intersector.site.site);
            }
            else{
                intersectorShortestDistance = Math.min(...intersector.sites.map(d => distance(e, d.site)));    
            }
            /*
            console.log(
                "distances",
                targetShortestDistance, 
                intersectorShortestDistance,
                JSON.stringify(intersector.sites.map(d => d.site)), 
                intersector.sites.map(d => distance(e, d.site)), 
                targetShortestDistance <= intersectorShortestDistance, 
                e, 
                JSON.stringify(target.sites.map(e => e.site))
            )
            */
            if(distance(e, intersector.sites[0].site) === distance(e, intersector.sites[1].site)){
                return samePoint(e, intersection) ||
                       !intersector.points.some((d,i,x) => {
                           if (i === x.length - 1){
                               return false;
                           }
                           else{
                               return distance(d,e) === distance(x[i+1],e)                        
                           }
                        }); 
            }
            else{
                return targetShortestDistance <= intersectorShortestDistance || samePoint(e, intersection); 
            }
            /*
            // Neil Trimming
            let trimmer = findL1Bisector(...intersector.sites, 400, 400);
            console.log(trimmer);
            let bisectorRays = target.sites.map(d => {
                return {points:[d.site, e], compound:false}
            });

            return bisectorRays.some(d => !bisectorIntersection(d, trimmer)) || 
                   samePoint(e, intersection) ||
                   distance(e, trimmer.sites[0].site) === distance(e, trimmer.sites[1].site);
            */
        });
        /*
        console.log(
            "trim made",
            JSON.stringify(newPoints), 
            JSON.stringify(target.points),
            "sites",
            JSON.stringify(target.sites.map(e => e.site)),
            JSON.stringify(intersector.sites.map(e => e.site)) 
        );
        */
    }
    else if(!target.compound && intersector.compound){
        //console.log("intersector compound", target, intersector);
        trimBisector(target, intersector.points[0]);
        trimBisector(target, intersector.points[1]);        
    }
    else if(target.compound && !intersector.compound){
        //console.log("target compound", target, intersector);        
        trimBisector(target.points[0], intersector);
        trimBisector(target.points[1], intersector);
    }
    else{
        //console.log("both compound", target, intersector);
        trimBisector(target.points[0], intersector.points[0]);
        trimBisector(target.points[0], intersector.points[1]);
        trimBisector(target.points[1], intersector.points[0]);
        trimBisector(target.points[1], intersector.points[1]);
    }

};

/**
 * Check to see if a bisector is traveling upward or downward with repect tot eh y axis
 * 
 * @param {Site} hopTo 
 * @param {Site} hopFrom 
 * @param {Site} site
 * @returns {boolean} 
 */
function isNewBisectorUpward(hopTo, hopFrom, site, goUp){
    
    let slope = (hopTo.site[1] - site.site[1])/(hopTo.site[0] - site.site[0]);
    let intercept = hopTo.site[1] - (slope * hopTo.site[0]);

    // this needs to be here to account for bisectors 
    if(Math.abs(slope) === Infinity){
        //console.log("verticle slope :/");
        //console.log( "Hop From:",hopFrom.site, "Hop to:", hopTo.site, "site:",site.site, "is upward", site.site[1] < hopTo.site[1] );
        return site.site[1] > hopTo.site[1];
    }

    let isAboveLine = hopFrom.site[1] > (slope * hopFrom.site[0]) + intercept;
    
    return isAboveLine;
}

/**
 * Find intersection of two bisectors, if it exists
 * 
 * @param {Bisector} B1 
 * @param {Bisector} B2
 * @returns {Array or boolean} 
 */
function bisectorIntersection(B1, B2, anchor){
    if(B1 === B2){
        return false;
    }
    // simple case, if they're both not compound
    if(!B1.compound && !B2.compound){
        //console.log(B1, B2);
        for(let i = 0; i < B1.points.length - 1; i++){
            for(let j = 0; j < B2.points.length - 1; j++){
                let intersect = segementIntersection([B1.points[i], B1.points[i+1]], [B2.points[j], B2.points[j+1]], i, j);
    
                if(intersect){
                    return intersect;
                }
            }
        }
    }
    // if one is compound
    else if(!B1.compound || !B2.compound){
        let compound = [B1,B2].find(e => e.compound);
        let notCompound = [B1,B2].find(e => !e.compound);

        let intersections = compound.points.map(e => {
            return bisectorIntersection(e,notCompound)
        })
        .filter(e => {
            return e;
        })
        .sort((a,b) => {
            return distance(a, anchor) - distance(b, anchor);
        });

        return intersections.length > 0 ? intersections[0] : false;
    }
    // if both are compound
    else{

        let intersections = B2.points.map(d => {

            let innerIntersections = B1.points.map(e => {
                return bisectorIntersection(e,d);
            })
            .filter(e => {
                return e;
            })
            .sort((a,b) => {
                return distance(a, anchor) - distance(b, anchor);
            });
    
            return innerIntersections.length > 0 ? innerIntersections[0] : false;
        })
        .filter(e => {
            return e;
        })
        .sort((a,b) => {
            console.log("a", a, "b", b, "anchor", anchor);
            return distance(a, anchor) - distance(b, anchor);
        });

        return intersections.length > 0 ? intersections[0] : false;
        
    }



    

    return false;
}

/**
 * find intersection of two line segements, if it exists
 * 
 * @param {LineSegment} L1 - in form [[x,y],[x,y]] 
 * @param {*} L2 - in form [[x,y],[x,y]]
 * @returns {Array or boolean}
 */
function segementIntersection(L1, L2){
    
    var ua, ub, denom = (L2[1][1] - L2[0][1])*(L1[1][0] - L1[0][0]) - (L2[1][0] - L2[0][0])*(L1[1][1] - L1[0][1]);
    
    // If denom is zero, that mean that both segemnts are verticle or horizontal, and we need to account for that.
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

/**
 * Determine if two points are the same point
 * 
 * @param {Array} P1 - in form [x,y] 
 * @param {Array} P2 - in form [x,y]
 */
function samePoint(P1, P2){
    return P1[0] === P2[0] && P1[1] === P2[1];
}


export {generateVoronoiPoints, generateL1Voronoi};
