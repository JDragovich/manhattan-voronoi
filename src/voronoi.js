function generateVoronoiPoints(points, width, height, distanceCallback){
    /*
    let closed = [];
    let open = [];

    // iterate the sweep line
    for(let i = 0; i <= height; i++){
        open.push(...points.filter(e => e[1] <= i));

        points = points.filter(e => e[1] > i);
        console.log(open);
    }
    */

    let colors = points.map(e =>{ return {point:e, color: new Array(3).fill(0).map(d => Math.ceil(Math.random() * 255))}})
    // console.log(colors);    
    let imageData = new Array(width * height).fill(0).map((point, index) => {
        let coordinate = [index % height , Math.ceil(index / height)];
        let closest = colors.reduce((c,e) => {
            //console.log(distanceCallback(c.point, coordinate), distanceCallback(e.point, coordinate))
            // return distanceCallback(c.point, coordinate) < distanceCallback(e.point, coordinate) ? c : e;
            if(Array.isArray(c)){
                return c.every(d => distanceCallback(d.point, coordinate) < distanceCallback(e.point, coordinate) ) ? c : e;
            }
            else if(distanceCallback(c.point, coordinate) === distanceCallback(e.point, coordinate)){
                // console.log("found equidistant");
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

    return recursiveSplit(sites);
    

    function recursiveSplit(splitArray){
        //console.log(splitArray);
        // if its got more than two points in it, split it recursively
        if(splitArray.length > 2){
            let splitPoint = (splitArray.length - splitArray.length % 2) / 2

            // merge the child diagrams
            let L = recursiveSplit(splitArray.slice(0,splitPoint));
            let R = recursiveSplit(splitArray.slice(splitPoint));
            
            // let w = L[L.length - 1];
            // let z = [width, w.site[1]];

            // let neightborArray = R.sort((a,b) => distance(w.site,a.site) - distance(w.site,a.site));

            


            // the current working sites
            let neightborArray = R.sort((a,b) => distance(L[L.length - 1].site,a.site) - distance(L[L.length - 1].site,b.site));
        
            let startingInfo = determineStartingBisector(L[L.length - 1], neightborArray[0], width);
            console.log(startingInfo);
            [startingInfo.w, startingInfo.nearestNeighbor].forEach(e => { e.bisectors.push(startingInfo.startingBisector) });

            let initialBisector = startingInfo.startingBisector;
            startingInfo.startingBisector.mergeLine = true;
            let initialR = startingInfo.nearestNeighbor;
            let initialL = startingInfo.w;
            console.log("finding intial crop point");
            let initialCropPoint = [(initialL.site[0] + initialR.site[0])/2, (initialL.site[1] + initialR.site[1])/2];
            let initialBisectorMidpoint = [400, 300];

            var count = 0;
            
            let upStroke = walkMergeLine(initialR, initialL, initialBisector, [400,400], true, null, true);
            let downStroke = walkMergeLine(initialR, initialL, initialBisector, [0,0], false, null, true);

            return downStroke;

            function walkMergeLine(currentR, currentL, currentBisector, currentCropPoint, goUp, crossedBorder = null, first = false){

                if(
                    !currentR.bisectors.some(e => e === currentBisector) ||
                    !currentL.bisectors.some(e => e === currentBisector)
                ){

                    currentBisector = findBisector([currentR,currentL]);
                    console.log("found new bisector");
                    console.log(currentBisector);
                    currentBisector.mergeLine = true;
                    trimBisector(currentBisector, crossedBorder, currentCropPoint);
                    
                    currentR.bisectors.push(currentBisector);
                    currentL.bisectors.push(currentBisector);
                }

                //let cropL = currentL.bisectors.reduce(bisectorReducer(currentBisector, currentL.site, goUp), {bisector:null, point:goUp ? [Infinity, Infinity] : [-Infinity, -Infinity]});
                //let cropR = currentR.bisectors.reduce(bisectorReducer(currentBisector, currentR.site, goUp), {bisector:null, point:goUp ? [Infinity, Infinity] : [-Infinity, -Infinity]});
                //console.log("simple example",isNewBisectorUpward({site:[1,1]},{site:[5,30]},{site:[10,10]}));
                
                let cropLArray = currentL.bisectors
                                    .map(e => {return {bisector:e, point:bisectorIntersection(currentBisector, e)}})
                                    .filter(e => {
                                        let hopTo = e.bisector.sites.find(d => d !== currentL);
                                        //console.log("Left Hop to:", isNewBisectorUpward(hopTo, currentL, currentR), !isNewBisectorUpward(hopTo, currentL, currentR));
                                        //hopTo, hopFrom, site
                                        return e.point && (goUp ? isNewBisectorUpward(hopTo, currentL, currentR) : !isNewBisectorUpward(hopTo, currentL, currentR)) && !samePoint(e.point, currentCropPoint);
                                    })
                                    .sort((a, b) => goUp ? a.point[1] - b.point[1] : b.point[1] - a.point[1]);
                
                let cropRArray = currentR.bisectors
                                    .map(e => {return {bisector:e, point:bisectorIntersection(currentBisector, e)}})
                                    .filter(e => {
                                        let hopTo = e.bisector.sites.find(d => d !== currentR);
                                        //console.log("Right Hop to:", isNewBisectorUpward(hopTo, currentR, currentL), !isNewBisectorUpward(hopTo, currentR, currentL));
                                        return e.point && (goUp ? isNewBisectorUpward(hopTo, currentR, currentL) : !isNewBisectorUpward(hopTo, currentR, currentL)) && !samePoint(e.point, currentCropPoint)
                                    })
                                    .sort((a, b) => goUp ? a.point[1] - b.point[1] : b.point[1] - a.point[1]);

                let cropL = cropLArray.length > 0 && cropLArray[0] !== currentBisector ? cropLArray[0] : {bisector:null, point:goUp ? [Infinity, Infinity] : [-Infinity, -Infinity]};
                let cropR = cropRArray.length > 0 && cropRArray[0] !== currentBisector ? cropRArray[0] : {bisector:null, point:goUp ? [Infinity, Infinity] : [-Infinity, -Infinity]};
                console.log(cropLArray, cropRArray, currentCropPoint);
                //console.log(currentL.bisectors.map(e => {return bisectorIntersection(currentBisector, e)}), currentR.bisectors.map(e => {return bisectorIntersection(currentBisector, e)}), currentCropPoint);



                //if no intersection, we're done.
                if(
                    (!cropL.bisector && !cropR.bisector) ||
                    (cropL.point[0] === cropR.point[0] && cropL.point[1] === cropR.point[1]) ||
                    /*
                    (
                        cropL.bisector.intersections.some(e => e[0] === cropL.point[0] && e[1] === cropL.point[1]) &&
                        cropR.bisector.intersections.some(e => e[0] === cropR.point[0] && e[1] === cropR.point[1])
                    ) ||
                    */
                    /*
                    (goUp && currentBisector.up && cropR.point[1] <= cropL.point[1] && currentCropPoint[0] === cropR.point[0] && currentCropPoint[1] === cropR.point[1]) ||
                    (goUp && currentBisector.up && cropR.point[1] >= cropL.point[1] && currentCropPoint[0] === cropL.point[0] && currentCropPoint[1] === cropL.point[1]) ||
                    (goUp && !currentBisector.up && cropR.point[0] <= cropL.point[0] && currentCropPoint[0] === cropR.point[0] && currentCropPoint[1] === cropR.point[1]) ||
                    (goUp && !currentBisector.up && cropR.point[0] >= cropL.point[0] && currentCropPoint[0] === cropL.point[0] && currentCropPoint[1] === cropL.point[1]) ||
                    
                    (!goUp && currentBisector.up && cropR.point[1] >= cropL.point[1] && currentCropPoint[0] === cropR.point[0] && currentCropPoint[1] === cropR.point[1]) ||
                    (!goUp && currentBisector.up && cropR.point[1] <= cropL.point[1] && currentCropPoint[0] === cropL.point[0] && currentCropPoint[1] === cropL.point[1]) ||
                    (!goUp && !currentBisector.up && cropR.point[0] >= cropL.point[0] && currentCropPoint[0] === cropR.point[0] && currentCropPoint[1] === cropR.point[1]) ||
                    (!goUp && !currentBisector.up && cropR.point[0] <= cropL.point[0] && currentCropPoint[0] === cropL.point[0] && currentCropPoint[1] === cropL.point[1]) ||
                    */
                    count > 100
                ){
                    console.log("all done");
                    console.log(count);
                    console.log(...L, ...R);
                    return [...L, ...R];
                }
                count++;

                console.log("crop points are", cropL.point, cropR.point);
                if(Math.abs(cropR.point[1] - currentCropPoint[1]) < Math.abs(cropL.point[1] - currentCropPoint[1]) && Math.abs(cropR.point[1] - currentCropPoint[1]) !== 0){
                    trimBisector(cropR.bisector, currentBisector, cropR.point);
                    trimBisector(currentBisector, cropR.bisector, cropR.point);
                    currentBisector.intersections.push(cropR.point);
                    //if(first){ initialCropPoint = cropR.point}
                    crossedBorder = cropR.bisector; 
                    currentR = cropR.bisector.sites.find(e => e !== currentR);
                    console.log("walked to new R", currentR.site, currentCropPoint[0] === cropR.point[0] && currentCropPoint[1] === cropR.point[1]);
                    currentCropPoint = cropR.point;               
                }
                else if(Math.abs(cropR.point[1] - currentCropPoint[1]) > Math.abs(cropL.point[1] - currentCropPoint[1])){
                    trimBisector(cropL.bisector, currentBisector, cropL.point);
                    trimBisector(currentBisector, cropL.bisector, cropL.point);
                    currentBisector.intersections.push(cropL.point);
                    //if(first){ initialCropPoint = cropL.point}
                    crossedBorder = cropL.bisector; 
                    currentL = cropL.bisector.sites.find(e => e !== currentL);
                    console.log("walked to new L", currentL.site, currentCropPoint[0] === cropL.point[0] && currentCropPoint[1] === cropL.point[1]);                        
                    currentCropPoint = cropL.point;                                       
                }
                /*
                if(currentBisector.up){
                    if(Math.abs(cropR.point[1] - currentCropPoint[1]) < Math.abs(cropL.point[1] - currentCropPoint[1]) && Math.abs(cropR.point[1] - currentCropPoint[1]) !== 0){
                        trimBisector(cropR.bisector, currentBisector, cropR.point);
                        trimBisector(currentBisector, cropR.bisector, cropR.point);
                        currentBisector.intersections.push(cropR.point);
                        //if(first){ initialCropPoint = cropR.point}
                        crossedBorder = cropR.bisector; 
                        currentR = cropR.bisector.sites.find(e => e !== currentR);
                        console.log("walked to new R", currentR.site, currentCropPoint[0] === cropR.point[0] && currentCropPoint[1] === cropR.point[1]);
                        currentCropPoint = cropR.point;               
                    }
                    else if(Math.abs(cropR.point[1] - currentCropPoint[1]) > Math.abs(cropL.point[1] - currentCropPoint[1])){
                        trimBisector(cropL.bisector, currentBisector, cropL.point);
                        trimBisector(currentBisector, cropL.bisector, cropL.point);
                        currentBisector.intersections.push(cropL.point);
                        //if(first){ initialCropPoint = cropL.point}
                        crossedBorder = cropL.bisector; 
                        currentL = cropL.bisector.sites.find(e => e !== currentL);
                        console.log("walked to new L", currentL.site, currentCropPoint[0] === cropL.point[0] && currentCropPoint[1] === cropL.point[1]);                        
                        currentCropPoint = cropL.point;                                       
                    }
                }
                else{
                    if(Math.abs(cropR.point[0] - currentCropPoint[0]) < Math.abs(cropL.point[0] - currentCropPoint[0]) && Math.abs(cropR.point[1] - currentCropPoint[1]) !== 0){
                        trimBisector(cropR.bisector, currentBisector, cropR.point);
                        trimBisector(currentBisector, cropR.bisector, cropR.point);
                        currentBisector.intersections.push(cropR.point);
                        //if(first){ initialCropPoint = cropR.point}
                        crossedBorder = cropR.bisector; 
                        currentR = cropR.bisector.sites.find(e => e !== currentR);
                        console.log("walked to new R", currentR.site, currentCropPoint[0] === cropR.point[0] && currentCropPoint[1] === cropR.point[1]);                        
                        currentCropPoint = cropR.point;                                       
                    }
                    else if(Math.abs(cropR.point[0] - currentCropPoint[0]) > Math.abs(cropL.point[0] - currentCropPoint[0])){
                        trimBisector(cropL.bisector, currentBisector, cropL.point);
                        trimBisector(currentBisector, cropL.bisector, cropL.point);
                        currentBisector.intersections.push(cropL.point);
                        //if(first){ initialCropPoint = cropL.point}
                        crossedBorder = cropL.bisector; 
                        currentL = cropL.bisector.sites.find(e => e !== currentL);
                        console.log("walked to new L", currentL.site, currentCropPoint[0] === cropL.point[0] && currentCropPoint[1] === cropL.point[1]);                                                
                        currentCropPoint = cropL.point;                        
                    }
                }
                */
                /*
                setTimeout(function(){
                    walkMergeLine(currentR, currentL, currentBisector, currentCropPoint);            
                }, 1000);
                */
                return walkMergeLine(currentR, currentL, currentBisector, currentCropPoint, goUp, crossedBorder);            
                
            };

        }
        // otherwise, determine te vertexes if its got two sites
        else if(splitArray.length === 2){
            let bisector = findBisector(splitArray);
            splitArray.forEach(e => { e.bisectors.push(bisector) });
            return splitArray;
        }
        // if its got just one, just return it for now...
        else{
            return splitArray;
        }
    }

    function distance(P1, P2){
        return Math.abs(P1[0] - P2[0]) + Math.abs(P1[1] - P2[1]);
    }

    function midPoint(P1, P2){
        return [(P1[0] + P2[0])/2, (P1[1] + P2[1])/2];
    }

    function bisectorReducer(currentBisector, site, goUp){

        return function(total, bisector){
            let intersect = bisectorIntersection(currentBisector, bisector);
            if(currentBisector.up){
                if(goUp){
                    return intersect && total.point[1] > intersect[1] && site[1] < intersect[1] ? {bisector:bisector, point:intersect} : total;        
                }
                else{
                    return intersect && total.point[1] < intersect[1] && site[1] > intersect[1] ? {bisector:bisector, point:intersect} : total;        
                }
            }
            else{
                if(goUp){
                    return intersect && total.point[0] > intersect[0] && site[0] < intersect[0] ? {bisector:bisector, point:intersect} : total;        
                }
                else{
                    return intersect && total.point[0] < intersect[0] && site[0] > intersect[0] ? {bisector:bisector, point:intersect} : total;        
                }
            }
            
        };
    };


    //determine starting bisector
    function determineStartingBisector(w, nearestNeighbor, width, lastIntersect = null){

        let z = [width, w.site[1]];

        if(!lastIntersect){
            lastIntersect = w.site;
        }
        
        let intersection = nearestNeighbor.bisectors.reduce((total,bisector) => {
            let intersect = bisector.points.reduce((c,e,k)=>{

                let intersection = null;

                if(k < bisector.points.length - 1){
                    intersection = {point:segementIntersection([intersect ? intersect :w.site,z], [e,bisector.points[k+1]]), bisector:bisector};
                    //console.log(intersection, [w.site,z],  [e,bisector.points[k+1]]);            
                }
                else{
                    intersection = false;
                }
                //console.log("c", c.point, "intersect", intersection.point, "last intersect", lastIntersect);
                if( !c.point ){
                    return intersection;
                }
                else if(intersection.point){
                    //console.log("for some reason this is not falsey", intersection);
                    return c.point[0] < intersection.point[0] ? intersection : c;                    
                }
                else{
                    return c;
                }
                
            }, {point:null});

            return Array.isArray(intersect.point) ? intersect : total;

        }, false);
        //console.log(distance(w.site, intersection.point), distance(nearestNeighbor.site, intersection.point));
        if( !intersection.point ){
            var startingBisector = findBisector([w, nearestNeighbor]);
            console.log("No intersection found");

            // if there is no intersection with the nearest neighbor and the no intersection with W's bisectors, we may have an orphan
            if(w.bisectors.every(bisector => !bisectorIntersection(startingBisector, bisector))){
                console.log("no intersection found on the right either.")
                startingBisector.mergeLine = true;
                
                w.bisectors.push(startingBisector);
                nearestNeighbor.bisectors.push(startingBisector)
                
                // find the nearest hopTo point
                let nextArray = nearestNeighbor.bisectors.map(e => e.sites.find(f => f !== nearestNeighbor))
                                                         .sort((a,b) => distance(w.site, a.site) - distance(w.site, a.site));

                return determineStartingBisector(w, nextArray[0], width, null);        
            }
            else{
                return {
                    startingBisector: startingBisector,
                    w:w,
                    nearestNeighbor: nearestNeighbor,
                    startingIntersection: intersection.point ? intersection.point : w.site
                };
            }
            
        }
        else if(intersection.point && distance(w.site, intersection.point) > distance(nearestNeighbor.site, intersection.point)){
            var startingBisector = findBisector([w, nearestNeighbor]);
            console.log("Intersection found and it is to the right of T");
            return {
                startingBisector: startingBisector,
                w:w,
                nearestNeighbor: nearestNeighbor,
                startingIntersection: intersection.point ? intersection.point : w.site
            };
        }
        else if(intersection.point && distance(w.site, intersection.point) < distance(nearestNeighbor.site, intersection.point) && intersection.point[0] > lastIntersect[0] ){
            console.log("intersection found, but it is to the left of T, moving on");
            let nextR = intersection.bisector.sites.find(e => e !== nearestNeighbor);
            return determineStartingBisector(w, nextR, width, intersection.point);
        }
        else{
            var startingBisector = findBisector([w, nearestNeighbor]);
            console.log("No intersection found anywhere, using the last one");
            
            // if there is no intersection with the nearest neighbor and the no intersection with W's bisectors, we may have an orphan
            if(w.bisectors.every(bisector => !bisectorIntersection(startingBisector, bisector))){
                console.log("no intersection found on the right either.")
                startingBisector.mergeLine = true;
                
                w.bisectors.push(startingBisector);
                nearestNeighbor.bisectors.push(startingBisector)
                
                // find the nearest hopTo point
                let nextArray = nearestNeighbor.bisectors.map(e => e.sites.find(f => f !== nearestNeighbor))
                                                         .sort((a,b) => distance(w.site, a.site) - distance(w.site, a.site));

                return determineStartingBisector(w, nextArray[0], width, null);        
            }
            else{
                return {
                    startingBisector: startingBisector,
                    w:w,
                    nearestNeighbor: nearestNeighbor,
                    startingIntersection: intersection.point ? intersection.point : w.site
                };
            }
        }

    };

    /*
    // should make this a method on some sort of bisector class
    function trimBisector(bisector, point, site, forceVerticle){
        let positive = bisector.up || forceVerticle ? site[1] - point[1] >= 0 : site[0] - point[0] >= 0;

        let newPoints = bisector.points.filter(e => {
            if(bisector.up || forceVerticle){

                if(positive){
                    return e[1] >= point[1];            
                }
                else{
                    return e[1] <= point[1];
                }

            }
            else{

                if(positive){
                    return e[0] > point[0];
                }
                else{
                    return e[0] < point[0];
                }

            }
        });

        newPoints.push(point);                
        newPoints.sort((a,b) =>{
            if(bisector.up){
                return a[1] - b[1]
            }
            else{
                return a[0] - b[0]
            }
        });        

        bisector.points = newPoints;

    }
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

    function isNewBisectorUpward(hopTo, hopFrom, site){
        // console.log(hopTo.site, hopFrom.site, site.site);
        let slope = (hopTo.site[1] - site.site[1])/(hopTo.site[0] - site.site[0]);
        let intercept = hopTo.site[1] - (slope * hopTo.site[0]);

        let isAboveLine = hopFrom.site[1] > (slope * hopFrom.site[0]) + intercept;
        // console.log("slope", slope, "intercept", intercept, "isAboveLine", isAboveLine, hopTo.site[1], (slope * hopTo.site[0]) + intercept);
        return isAboveLine;

        /*
        let top, bottom, hopToIsTop;

        if(hopTo.site[1] > site.site[1]){
            top = hopTo.site;
            bottom = site.site;
            hopToIsTop = true;
        }
        else{
            top = site.site;
            bottom = hopTo.site;
            hopToIsTop = false;
        }
        
        let topHalf = [bottom[0], top[1]];
        let bottomHalf = [top[0], bottom[1]];

        console.log("hop to is top:",hopToIsTop, "closer to bottom half?", distance(hopFrom.site, topHalf) > distance(hopFrom.site, bottomHalf));
        if(distance(hopFrom.site, topHalf) > distance(hopFrom.site, bottomHalf)){
            return true;
        }
        else{
            return false;
        }
        */
    }

    function bisectorIntersection(B1, B2){
        if(B1 === B2){
            return false;
        }

        for(let i = 0; i < B1.points.length - 1; i++){
            for(let j = 0; j < B2.points.length - 1; j++){
                //console.log(i,j);
                let intersect = segementIntersection([B1.points[i], B1.points[i+1]], [B2.points[j], B2.points[j+1]], i, j);
                //console.log(intersect);
                //console.assert(!intersect, `found segment intersect ${intersect}`);

                if(intersect){
                    return intersect;
                }
            }
        }

        return false;
    }

    function findBisector(splitArray){
        let xDistance = splitArray[0].site[0] - splitArray[1].site[0];
        let yDistance = splitArray[0].site[1] - splitArray[1].site[1];
    
        let midpoint = [
            (splitArray[0].site[0] + splitArray[1].site[0]) / 2,
            (splitArray[0].site[1] + splitArray[1].site[1]) / 2
        ];
    
        let slope = yDistance/xDistance > 0 ? -1 : 1;
    
        let intercetpt = midpoint[1] - midpoint[0] * slope;
    
        let vertexes = [];
        let up = null;
        
        if(Math.abs(xDistance) > Math.abs(yDistance)){
            vertexes = [
                [(splitArray[0].site[1] - intercetpt) / slope, splitArray[0].site[1]],
                [(splitArray[1].site[1] - intercetpt) / slope, splitArray[1].site[1]]
            ];
    
            up = true;
        }
        else{
            vertexes = [
                [splitArray[0].site[0] , (splitArray[0].site[0] * slope) + intercetpt ],
                [splitArray[1].site[0] , (splitArray[1].site[0] * slope) + intercetpt ]
            ];
    
            up = false;
        }
    
        let bisector = {sites:[...splitArray], up:up, points:[], intersections:[]};

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

        // This is all kinda gross...
        return bisector;
    }

    function segementIntersection(L1, L2, i, j){

        var ua, ub, denom = (L2[1][1] - L2[0][1])*(L1[1][0] - L1[0][0]) - (L2[1][0] - L2[0][0])*(L1[1][1] - L1[0][1]);
        
        // if denom is zero, that mean that both segemnts are verticle or horizontal, and we need to account for that.
        if (denom == 0) {
            /*
            console.log("found two verticle/horizontal");
            
            //we need to check to see if they are alternatively 
            if(
                (L2[1][1] - L2[0][1] === 0 && L1[1][0] - L1[0][0] === 0) ||
                (L2[1][0] - L2[0][0] === 0 && L1[1][1] - L1[0][1] === 0) 
            ){
                return [
                    L1[1][0] - L1[0][0] === 0 ? L1[1][0] : L2[1][0],
                    L1[1][1] - L1[0][1] === 0 ? L1[1][1] : L2[1][1] 
                ];
            }
            */
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
        ]

        /*
        let A1 = L1[1][1] - L1[0][1];
        let B1 = L1[0][0] - L1[1][0];
        let C1 = A1 * L1[0][0] + B1 * L1[0][1];

        let A2 = L2[1][1] - L2[0][1];
        let B2 = L2[0][0] - L2[1][0];
        let C2 = A2 * L2[0][0] + B2 * L2[0][1];

        let det = A1 * B2 - A2 * B1;
        if(det === 0){
            return false;
        }

        let intersect =  [
            (B2 * C1 - B1 * C2)/det,
            (A1 * C2 - A2 * C1)/det
        ];
        console.log(i,j, det, intersect, Math.min(L1[0][0],L1[1][0]) <= intersect[0] &&
        Math.min(L1[0][1],L1[1][1]) <= intersect[1] &&
        Math.max(L1[0][0],L1[1][0]) >= intersect[0] &&
        Math.max(L1[0][1],L1[1][1]) >= intersect[1] &&

        Math.min(L2[0][0],L2[1][0]) <= intersect[0] &&
        Math.min(L2[0][1],L2[1][1]) <= intersect[1] &&
        Math.max(L2[0][0],L2[1][0]) >= intersect[0] &&
        Math.max(L2[0][1],L2[1][1]) >= intersect[1]);        
        //console.log(intersect, det, A1, B2, A2, B1, L1[0], L1[1], L2[0], L2[1]);
        //check for vertical an horizontal
        if(L1[0][0] ===  L1[1][0]){
            //console.log("L1 verticle");
            intersect[0] = L1[0][0]
        }

        if(L2[0][0] ===  L2[1][0]){
            //console.log("L2 verticle");            
            intersect[0] = L2[0][0]
        }

        if(L1[0][1] ===  L1[1][1]){
            //console.log("L1 horozontal");            
            intersect[1] = L2[0][1]
        }

        if(L2[0][1] ===  L2[1][1]){
            //console.log("L2 horozontal");                        
            intersect[1] = L2[0][1]
        }
        /*
        console.assert(
            Math.min(L1[0][0],L1[1][0]) <= intersect[0] &&
            Math.min(L1[0][1],L1[1][1]) <= intersect[1] &&
            Math.max(L1[0][0],L1[1][0]) >= intersect[0] &&
            Math.max(L1[0][1],L1[1][1]) >= intersect[1] &&

            Math.min(L2[0][0],L2[1][0]) <= intersect[0] &&
            Math.min(L2[0][1],L2[1][1]) <= intersect[1] &&
            Math.max(L2[0][0],L2[1][0]) >= intersect[0] &&
            Math.max(L2[0][1],L2[1][1]) >= intersect[1]
        , L1, L2, intersect);
        
        // now check if its on the segements
        if(
            Math.min(L1[0][0],L1[1][0]) <= intersect[0] &&
            Math.min(L1[0][1],L1[1][1]) <= intersect[1] &&
            Math.max(L1[0][0],L1[1][0]) >= intersect[0] &&
            Math.max(L1[0][1],L1[1][1]) >= intersect[1] &&

            Math.min(L2[0][0],L2[1][0]) <= intersect[0] &&
            Math.min(L2[0][1],L2[1][1]) <= intersect[1] &&
            Math.max(L2[0][0],L2[1][0]) >= intersect[0] &&
            Math.max(L2[0][1],L2[1][1]) >= intersect[1]
        ){
            return intersect;
        }
        else{
            return false;
        }
        */
    }

    function samePoint(P1, P2){
        return P1[0] === P2[0] && P1[1] === P2[1];
    }

}



export {generateVoronoiPoints, generateL1Voronoi};