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
 * Nudge points to hopefully eliminate square bisectors
 * 
 * @param {Array<[x,y]>} data 
 */
function cleanData(data){
    data.forEach((e,i)=> {
        data.forEach((d,j) => {
            if(
                i !== j &&
                Math.abs(d[0] - e[0]) === Math.abs(d[1] - e[1])
            ){
                d[0] = d[0] + 1e-10*d[0];
                d[1] = d[1] - 2e-10*d[1];
            }
        });
    });
    return data;
}

/**
 * Generate an L1 Voronoi diagram
 * 
 * @param {array} sitePoints 
 * @param {number} width 
 * @param {number} height
 * @param {boolean} nudgeData
 * @returns {Array<Site>} 
 */

function generateL1Voronoi(sitePoints, width, height, nudgeData = true){

    if(nudgeData){
        console.log("nudging data");
        sitePoints = cleanData(sitePoints);
    }

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

    return graph.map(site => {
        
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

                return {
                    points:[...total.points, ...nextPoints],
                    used: [...total.used, nextBisector]
                };
            }
        },{}).points;
        

       const corners = [
            [0,0],
            [width, 0],
            [width, height],
            [0,height]
        ];
        
        // finally we need to catch if it ends one an edge
        if(
            isPointonEdge(site.polygonPoints[0]) &&
            isPointonEdge(site.polygonPoints[site.polygonPoints.length - 1]) &&
            !arePointsOnSameEdge(site.polygonPoints[0], site.polygonPoints[site.polygonPoints.length - 1])
        ){
            
            const filteredCorners = corners.filter(e => {
                return site.bisectors.every(d => !bisectorIntersection({points:[e, site.site]}, d));     
            });

            site.polygonPoints = [...site.polygonPoints, ...filteredCorners];
        }

        site.polygonPoints = site.polygonPoints.sort((a,b)=> angle(site.site, a) - angle(site.site, b));

        site.d = `M ${ site.polygonPoints.map(e => e.join(" ")).join(" L")} Z`;

        return site;
    });

    function isPointonEdge(point) {
        return point[0] === 0 ||
               point[0] === width ||
               point[1] === 0 ||
               point[1] === height;
    }

    function arePointsOnSameEdge(P1, P2){
        return (P1[0] === P2[0] && P1[0] === 0)     ||
               (P1[0] === P2[0] && P1[0] === width) ||
               (P1[1] === P2[1] && P1[1] === 0)     ||
               (P1[1] === P2[1] && P1[1] === height)
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

        let upStrokeArray = walkMergeLine(initialR, initialL, initialBisector, [width,height], true, null, [], findBisector);
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

        trimBisector(currentBisector, crossedBorder, currentCropPoint);
        
        mergeArray.push(currentBisector);
    }
    
    let cropLArray = currentL.bisectors
                        .map(e => {return {bisector:e, point:bisectorIntersection(currentBisector, e)}})
                        .filter(e => {
                            let hopTo = e.bisector.sites.find(d => d !== currentL);
                            return e.point && (goUp === isNewBisectorUpward(hopTo, currentL, currentR, goUp)) && !samePoint(e.point, currentCropPoint);
                        })
                        .sort((a, b) => {
                            return angle(currentL.site, findHopTo(b.bisector, currentL).site) - angle(currentL.site, findHopTo(a.bisector, currentL).site)                            
                        })
                        .filter((e, i, candidates) => {
                            let hopTo = findHopTo(e.bisector, currentL);
                            let newMergeLine = findBisector(currentR, hopTo);
                            trimBisector(newMergeLine, e.bisector, e.point);
                            return candidates.every(d => !isBisectorTrapped(findHopTo(d.bisector, currentL), newMergeLine) || findHopTo(d.bisector, currentL) === hopTo);
                        });
    
    let cropRArray = currentR.bisectors
                        .map(e => {return {bisector:e, point:bisectorIntersection(currentBisector, e)}})
                        .filter(e => {
                            let hopTo = e.bisector.sites.find(d => d !== currentR);
                            return e.point && (goUp === isNewBisectorUpward(hopTo, currentR, currentL, goUp)) && !samePoint(e.point, currentCropPoint);
                        })
                        .sort((a, b) => {
                            return angle(currentR.site, findHopTo(a.bisector, currentR).site) - angle(currentR.site, findHopTo(b.bisector, currentR).site)                            
                        })
                        .filter((e, i, candidates) => {
                            let hopTo = findHopTo(e.bisector, currentR);
                            let newMergeLine = findBisector(currentL, hopTo);
                            trimBisector(newMergeLine, e.bisector, e.point);
                            return candidates.every(d => !isBisectorTrapped(findHopTo(d.bisector, currentR), newMergeLine) || findHopTo(d.bisector, currentR) === hopTo);
                        });

    let cropL = cropLArray.length > 0 && cropLArray[0] !== currentBisector ? cropLArray[0] : {bisector:null, point:goUp ? [Infinity, Infinity] : [-Infinity, -Infinity]};
    let cropR = cropRArray.length > 0 && cropRArray[0] !== currentBisector ? cropRArray[0] : {bisector:null, point:goUp ? [Infinity, Infinity] : [-Infinity, -Infinity]};
    
    // If no intersection, we're done.
    if(
        (!cropL.bisector && !cropR.bisector)
    ){
        // If the final merge bisector is horizontal, check to see if there are orphans 
        let leftOrphan = checkForOphans(currentR, currentL, goUp, findBisector); 
        let rightOrphan = checkForOphans(currentL, currentR, goUp, findBisector);

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

            return walkMergeLine(currentR, hopTo, newMergeBisector, currentCropPoint, goUp, crossedBorder, mergeArray, findBisector);

        }
        else if(
            rightOrphan
        ){
            // Remove trapped bisector
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

    // determine which point  
    if(determineFirstBorderCross(cropR, cropL, currentCropPoint) === "right"){
        trimBisector(cropR.bisector, currentBisector, cropR.point);
        trimBisector(currentBisector, cropR.bisector, cropR.point);
        currentBisector.intersections.push(cropR.point);
        crossedBorder = cropR.bisector;
        currentR = cropR.bisector.sites.find(e => e !== currentR);
        currentCropPoint = cropR.point;               
    }
    else if(determineFirstBorderCross(cropR,cropL,currentCropPoint) === "left"){
        trimBisector(cropL.bisector, currentBisector, cropL.point);
        trimBisector(currentBisector, cropL.bisector, cropL.point);
        currentBisector.intersections.push(cropL.point);
        crossedBorder = cropL.bisector;
        currentL = cropL.bisector.sites.find(e => e !== currentL);
        currentCropPoint = cropL.point;                                       
    }
    else{
        trimBisector(cropR.bisector, currentBisector, cropR.point);
        trimBisector(currentBisector, cropR.bisector, cropR.point);
        currentBisector.intersections.push(cropR.point);
        crossedBorder = cropR.bisector;
        currentR = cropR.bisector.sites.find(e => e !== currentR);
        currentCropPoint = cropR.point;

        trimBisector(cropL.bisector, currentBisector, cropL.point);
        trimBisector(currentBisector, cropL.bisector, cropL.point);
        currentBisector.intersections.push(cropL.point);
        crossedBorder = cropL.bisector;
        currentL = cropL.bisector.sites.find(e => e !== currentL);
        currentCropPoint = cropL.point;
    }

    return walkMergeLine(currentR, currentL, currentBisector, currentCropPoint, goUp, crossedBorder, mergeArray, findBisector);            
    
}

function angle(P1, P2){
    let angle = Math.atan2(P2[1] - P1[1], P2[0] - P1[0]);

    if(angle < 0){
        angle = Math.PI + Math.PI + angle; 
    }

    return angle;
}

function determineFirstBorderCross(cropR,cropL,currentCropPoint){
    if(Math.abs(cropR.point[1] - currentCropPoint[1]) === Math.abs(cropL.point[1] - currentCropPoint[1])){
        return null
    }
    else{
        return Math.abs(cropR.point[1] - currentCropPoint[1]) < Math.abs(cropL.point[1] - currentCropPoint[1]) ? "right" : "left";
    }
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
    
    if(Math.abs(xDistance) === Math.abs(yDistance)){
        throw new Error(
            `Square bisector: Points ${JSON.stringify(P1)} and ${JSON.stringify(P2)} are points on a square 
            (That is, their vertical distance is equal to their horizontal distance). Consider using the nudge points function or set the nudge data flag.`
        );
    }

    if(samePoint(P1.site,P2.site)){
        throw new Error(`Duplicate point: Points ${JSON.stringify(P1)} and ${JSON.stringify(P2)} are duplicates. please remove one`);
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
    if(Math.abs(xDistance) >= Math.abs(yDistance)){
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
    return bisector.points.every(point => distance(trapPoint.site, point) <= distance(bisector.sites[0].site, point) && distance(trapPoint.site, point) <= distance(bisector.sites[1].site, point));
}

/**
 * Find the highest or lowest point of a potential bisector.
 * 
 * @param {Bisector} bisector 
 * @param {boolean} goUp 
 */
function getExtremePoint(bisector, goUp){
    return bisector.points.reduce((c,e)=>{
        return goUp ? Math.max(e[1],c) : Math.min(e[1],c);
    }, goUp ? -Infinity : Infinity);
}

/**
 * Trim a bisector at a particular point, discarding the points lying within the other polygon
 * 
 * @param {Bisector} target 
 * @param {Bisector} intersector 
 * @param {Array} intersection in form [x,y] 
 */
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


export {generateVoronoiPoints, generateL1Voronoi, cleanData};
