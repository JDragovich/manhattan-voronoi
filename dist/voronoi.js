"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

/**
 * Generate Voronoi points via a basic, naive algorithm. Takes any distance callback
 * 
 * @param {array} points 
 * @param {number} width 
 * @param {number} height 
 * @param {function} distanceCallback
 * @returns {Array<Site>} 
 */

function generateVoronoiPoints(points, width, height, distanceCallback) {

    var colors = points.map(function (e) {
        return { point: e, color: new Array(3).fill(0).map(function (d) {
                return Math.ceil(Math.random() * 255);
            }) };
    });

    var imageData = new Array(width * height).fill(0).map(function (point, index) {
        var coordinate = [index % height, Math.ceil(index / height)];
        var closest = colors.map(function (e) {
            return { color: e, distance: distanceCallback(e.point, coordinate) };
        }).map(function (e, i, array) {
            return { color: e.color, distance: e.distance, dup: array.some(function (d) {
                    return d.distance === e.distance && d !== e;
                }) };
        }).sort(function (a, b) {
            return a.distance - b.distance;
        });

        return closest[0].dup ? [0, 0, 0] : closest[0].color.color;
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

function generateL1Voronoi(sitePoints, width, height) {

    // sort points by x axis, breaking ties with y
    var sites = sitePoints.sort(function (a, b) {
        if (a[0] !== b[0]) {
            return a[0] - b[0];
        } else {
            return a[1] - b[1];
        }
    }).map(function (e) {
        return { site: e, bisectors: [] };
    });

    var findBisector = curryFindBisector(findL1Bisector, width, height);
    var graph = recursiveSplit(sites, findBisector, width, height);
    //console.log(graph);
    return graph.map(function (site) {
        //console.log(site);

        var filteredBisectors = site.bisectors.map(function (e) {
            return !e.compound ? e : e.points.find(function (d) {
                return d.site === site;
            });
        });

        site.polygonPoints = filteredBisectors.reduce(function (total, bisector, index, bisectors) {

            if (index === 0) {

                //find a bisector on an edge if you have one
                var startBisector = bisectors.find(function (e) {
                    return e.points.some(function (e) {
                        return isPointonEdge(e);
                    });
                }) || bisector;

                var startingPoints = startBisector.points;

                if (isPointonEdge(startingPoints[startingPoints.length - 1])) {
                    startingPoints = startingPoints.reverse();
                }

                return {
                    points: startingPoints,
                    used: [startBisector]
                };
            } else {
                var last = total.points[total.points.length - 1];

                var nextBisector = bisectors.filter(function (e) {
                    return total.used.every(function (d) {
                        return e !== d;
                    });
                }).reduce(function (c, e) {

                    var eDistance = distance(last, e.points[0]) < distance(last, e.points[e.points.length - 1]) ? distance(last, e.points[0]) : distance(last, e.points[e.points.length - 1]);
                    var cDistance = distance(last, c.points[0]) < distance(last, c.points[c.points.length - 1]) ? distance(last, c.points[0]) : distance(last, c.points[c.points.length - 1]);

                    return eDistance < cDistance ? e : c;
                }, { points: [[Infinity, Infinity]] });

                var nextPoints = nextBisector.points;

                if (samePoint(nextPoints[nextPoints.length - 1], last)) {
                    nextPoints = nextPoints.reverse();
                }

                nextPoints = nextPoints.filter(function (e) {
                    return !samePoint(e, last);
                });

                return {
                    points: [].concat(_toConsumableArray(total.points), _toConsumableArray(nextPoints)),
                    used: [].concat(_toConsumableArray(total.used), [nextBisector])
                };
            }
        }, {}).points;

        var head = site.polygonPoints[0];
        var tail = site.polygonPoints[site.polygonPoints.length - 1];

        if (isPointonEdge(head) && isPointonEdge(tail)) {
            var cornerX = head[0] === 0 || head[0] === width ? head[0] : tail[0];
            var cornerY = head[1] === 0 || head[1] === height ? head[1] : tail[1];

            site.polygonPoints.push([cornerX, cornerY]);
        }

        site.d = "M " + site.polygonPoints.map(function (e) {
            return e.join(" ");
        }).join(" L") + " Z";

        return site;
    });

    function isPointonEdge(point) {
        return point[0] === 0 || point[0] === width || point[1] === 0 || point[1] === height;
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
function recursiveSplit(splitArray, findBisector, width, height) {

    // if its got more than two points in it, split it recursively
    if (splitArray.length > 2) {
        var splitPoint = (splitArray.length - splitArray.length % 2) / 2;

        // merge the child diagrams
        var L = recursiveSplit(splitArray.slice(0, splitPoint), findBisector, width, height);
        var R = recursiveSplit(splitArray.slice(splitPoint), findBisector, width, height);

        // the current working sites
        var neightborArray = R.sort(function (a, b) {
            return distance(L[L.length - 1].site, a.site) - distance(L[L.length - 1].site, b.site);
        });

        var startingInfo = determineStartingBisector(L[L.length - 1], neightborArray[0], width, null, findBisector);

        var initialBisector = startingInfo.startingBisector;
        var initialR = startingInfo.nearestNeighbor;
        var initialL = startingInfo.w;

        var upStrokeArray = walkMergeLine(initialR, initialL, initialBisector, [width, height], true, null, [], findBisector);
        var downStrokeArray = walkMergeLine(initialR, initialL, initialBisector, [0, 0], false, null, [], findBisector);

        // combine all teh merge arrays
        var mergeArray = [initialBisector].concat(_toConsumableArray(upStrokeArray), _toConsumableArray(downStrokeArray));

        mergeArray.forEach(function (bisector) {
            bisector.mergeLine = splitArray.length;
            bisector.sites[0].bisectors = clearOutOrphans(bisector.sites[0], bisector.sites[1]);
            bisector.sites[1].bisectors = clearOutOrphans(bisector.sites[1], bisector.sites[0]);

            bisector.sites.forEach(function (site) {
                site.bisectors.push(bisector);
            });
        });

        return [].concat(_toConsumableArray(L), _toConsumableArray(R));
    }

    // otherwise, determine te vertexes if its got two sites
    else if (splitArray.length === 2) {
            var bisector = findBisector.apply(undefined, _toConsumableArray(splitArray));
            //console.log(bisector);
            splitArray.forEach(function (e) {
                e.bisectors.push(bisector);
            });
            return splitArray;
        }

        // if its got just one, just return it
        else {
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
function walkMergeLine(currentR, currentL, currentBisector, currentCropPoint, goUp) {
    var crossedBorder = arguments.length > 5 && arguments[5] !== undefined ? arguments[5] : null;
    var mergeArray = arguments.length > 6 && arguments[6] !== undefined ? arguments[6] : [];
    var findBisector = arguments[7];


    if (!currentBisector.sites.every(function (e) {
        return e === currentR || e === currentL;
    })) {

        currentBisector = findBisector(currentR, currentL);

        trimBisector(currentBisector, crossedBorder, currentCropPoint, true);

        mergeArray.push(currentBisector);
    }

    var cropLArray = currentL.bisectors.map(function (e) {
        return { bisector: e, point: bisectorIntersection(currentBisector, e, currentCropPoint) };
    }).filter(function (e) {
        var hopTo = e.bisector.sites.find(function (d) {
            return d !== currentL;
        });
        return e.point && goUp === isNewBisectorUpward(hopTo, currentL, currentR, goUp) && !samePoint(e.point, currentCropPoint);
    }).sort(function (a, b) {
        if (samePoint(a.point, b.point)) {
            console.log("corner problem Left");
            //console.log(angle(currentL.site, findHopTo(b.bisector, currentL).site), angle(currentL.site, findHopTo(a.bisector, currentL).site) )
            return angle(currentL.site, findHopTo(b.bisector, currentL).site) - angle(currentL.site, findHopTo(a.bisector, currentL).site);
        }
        return angle(currentL.site, findHopTo(b.bisector, currentL).site) - angle(currentL.site, findHopTo(a.bisector, currentL).site);
        //return goUp ? a.point[1] - b.point[1] : b.point[1] - a.point[1];
    }).filter(function (e, i, candidates) {
        var hopTo = findHopTo(e.bisector, currentL);
        var newMergeLine = findBisector(currentR, hopTo);
        trimBisector(newMergeLine, e.bisector, e.point);
        return candidates.every(function (d) {
            return !isBisectorTrapped(findHopTo(d.bisector, currentL), newMergeLine) || findHopTo(d.bisector, currentL) === hopTo;
        });
    });

    var cropRArray = currentR.bisectors.map(function (e) {
        return { bisector: e, point: bisectorIntersection(currentBisector, e, currentCropPoint) };
    }).filter(function (e) {
        var hopTo = e.bisector.sites.find(function (d) {
            return d !== currentR;
        });
        return e.point && goUp === isNewBisectorUpward(hopTo, currentR, currentL, goUp) && !samePoint(e.point, currentCropPoint);
    }).sort(function (a, b) {
        if (samePoint(a.point, b.point)) {
            console.log("corner problem Right");
            //console.log(findHopTo(a.bisector,currentR),checkForOphans(currentL, findHopTo(a.bisector,currentR), goUp, findBisector), checkForOphans(currentL, findHopTo(b.bisector,currentR), goUp, findBisector))
            return angle(currentR.site, findHopTo(a.bisector, currentR).site) - angle(currentR.site, findHopTo(b.bisector, currentR).site);
        }
        return angle(currentR.site, findHopTo(a.bisector, currentR).site) - angle(currentR.site, findHopTo(b.bisector, currentR).site);
        //return goUp ? a.point[1] - b.point[1] : b.point[1] - a.point[1];
    }).filter(function (e, i, candidates) {
        var hopTo = findHopTo(e.bisector, currentR);
        var newMergeLine = findBisector(currentL, hopTo);
        trimBisector(newMergeLine, e.bisector, e.point);
        return candidates.every(function (d) {
            return !isBisectorTrapped(findHopTo(d.bisector, currentR), newMergeLine) || findHopTo(d.bisector, currentR) === hopTo;
        });
    });

    var cropL = cropLArray.length > 0 && cropLArray[0] !== currentBisector ? cropLArray[0] : { bisector: null, point: goUp ? [Infinity, Infinity] : [-Infinity, -Infinity] };
    var cropR = cropRArray.length > 0 && cropRArray[0] !== currentBisector ? cropRArray[0] : { bisector: null, point: goUp ? [Infinity, Infinity] : [-Infinity, -Infinity] };
    // console.log(cropLArray, cropRArray, goUp, currentL.site, currentR.site, checkForOphans(currentR, currentL, goUp, findBisector), checkForOphans(currentL, currentR, goUp, findBisector));                    
    // If no intersection, we're done.
    if (!cropL.bisector && !cropR.bisector) {
        // If the final merge bisector is horizontal, check to see if there are orphans 
        var leftOrphan = checkForOphans(currentR, currentL, goUp, findBisector);
        var rightOrphan = checkForOphans(currentL, currentR, goUp, findBisector);

        if (leftOrphan) {
            // Remove trapped bisector
            leftOrphan.sites.forEach(function (site) {
                site.bisectors = site.bisectors.filter(function (e) {
                    return e !== leftOrphan;
                });
            });

            var hopTo = findHopTo(leftOrphan, currentL);

            currentR = findCorrectW(currentR, hopTo, findBisector);
            var newMergeBisector = findBisector(hopTo, currentR);

            mergeArray.push(newMergeBisector);

            return walkMergeLine(currentR, hopTo, newMergeBisector, currentCropPoint, goUp, crossedBorder, mergeArray, findBisector);
        } else if (rightOrphan) {
            // Remove trapped bisector
            rightOrphan.sites.forEach(function (site) {
                site.bisectors = site.bisectors.filter(function (e) {
                    return e !== rightOrphan;
                });
            });

            var _hopTo = findHopTo(rightOrphan, currentR);

            currentL = findCorrectW(currentL, _hopTo, findBisector);
            var _newMergeBisector = findBisector(_hopTo, currentL);

            mergeArray.push(_newMergeBisector);

            return walkMergeLine(_hopTo, currentL, _newMergeBisector, currentCropPoint, goUp, crossedBorder, mergeArray, findBisector);
        }

        return mergeArray;
    }

    if (Math.abs(cropR.point[1] - currentCropPoint[1]) < Math.abs(cropL.point[1] - currentCropPoint[1])) {
        trimBisector(cropR.bisector, currentBisector, cropR.point);
        trimBisector(currentBisector, cropR.bisector, cropR.point);
        currentR.bisectors.filter(function (e) {
            return e.compound;
        }).forEach(function (d) {
            return trimBisector(d, currentBisector);
        });
        //currentBisector.intersections.push(cropR.point);
        crossedBorder = cropR.bisector;
        currentR = cropR.bisector.sites.find(function (e) {
            return e !== currentR;
        });
        currentCropPoint = cropR.point;
    } else if (Math.abs(cropR.point[1] - currentCropPoint[1]) > Math.abs(cropL.point[1] - currentCropPoint[1])) {
        trimBisector(cropL.bisector, currentBisector, cropL.point);
        trimBisector(currentBisector, cropL.bisector, cropL.point);
        currentL.bisectors.filter(function (e) {
            return e.compound;
        }).forEach(function (d) {
            return trimBisector(d, currentBisector);
        });
        //currentBisector.intersections.push(cropL.point);
        crossedBorder = cropL.bisector;
        currentL = cropL.bisector.sites.find(function (e) {
            return e !== currentL;
        });
        currentCropPoint = cropL.point;
    } else {
        console.log("double moving on...");
        trimBisector(cropR.bisector, currentBisector, cropR.point);
        trimBisector(currentBisector, cropR.bisector, cropR.point);
        currentR.bisectors.filter(function (e) {
            return e.compound;
        }).forEach(function (d) {
            return trimBisector(d, currentBisector);
        });
        currentL.bisectors.filter(function (e) {
            return e.compound;
        }).forEach(function (d) {
            return trimBisector(d, currentBisector);
        });

        //currentBisector.intersections.push(cropR.point);
        crossedBorder = cropR.bisector;
        currentR = cropR.bisector.sites.find(function (e) {
            return e !== currentR;
        });
        currentCropPoint = cropR.point;

        trimBisector(cropL.bisector, currentBisector, cropL.point);
        trimBisector(currentBisector, cropL.bisector, cropL.point);
        //currentBisector.intersections.push(cropL.point);
        crossedBorder = cropL.bisector;
        currentL = cropL.bisector.sites.find(function (e) {
            return e !== currentL;
        });
        currentCropPoint = cropL.point;
    }

    currentR.bisectors.forEach(function (e) {
        return trimBisector(currentBisector, e);
    });
    currentL.bisectors.forEach(function (e) {
        return trimBisector(currentBisector, e);
    });

    return walkMergeLine(currentR, currentL, currentBisector, currentCropPoint, goUp, crossedBorder, mergeArray, findBisector);
}

function angle(P1, P2) {
    var angle = Math.atan2(P2[1] - P1[1], P2[0] - P1[0]);

    if (angle < 0) {
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
function determineStartingBisector(w, nearestNeighbor, width) {
    var lastIntersect = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : null;
    var findBisector = arguments[4];


    var z = [width, w.site[1]];

    if (!lastIntersect) {
        lastIntersect = w.site;
    }

    var zline = { points: [w.site, z], compound: false };

    var intersection = nearestNeighbor.bisectors.map(function (bisector) {
        return { point: bisectorIntersection(zline, bisector, w.site), bisector: bisector };
    }).find(function (intersection) {
        return intersection.point;
    });

    if (intersection && distance(w.site, intersection.point) > distance(nearestNeighbor.site, intersection.point)) {
        var startingBisector = findBisector(w, nearestNeighbor);
        return {
            startingBisector: startingBisector,
            w: w,
            nearestNeighbor: nearestNeighbor,
            startingIntersection: intersection.point ? intersection.point : w.site
        };
    } else if (intersection && distance(w.site, intersection.point) < distance(nearestNeighbor.site, intersection.point) && intersection.point[0] > lastIntersect[0]) {
        var nextR = intersection.bisector.sites.find(function (e) {
            return e !== nearestNeighbor;
        });
        return determineStartingBisector(w, nextR, width, intersection.point, findBisector);
    } else {
        w = findCorrectW(w, nearestNeighbor, findBisector);

        var _startingBisector = findBisector(w, nearestNeighbor);

        return {
            startingBisector: _startingBisector,
            w: w,
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
function findCorrectW(w, nearestNeighbor, findBisector) {

    var startingBisector = findBisector(w, nearestNeighbor);

    var wTrap = w.bisectors.map(function (e) {
        var hopTo = findHopTo(e, w);
        return { hopTo: hopTo, isTrapped: isBisectorTrapped(hopTo, startingBisector) };
    }).filter(function (e) {
        return e.isTrapped;
    }).sort(function (a, b) {
        return distance(a.hopTo.site, nearestNeighbor.site) - distance(b.hopTo.site, nearestNeighbor.site);
    })[0];

    if (wTrap) {
        return findCorrectW(wTrap.hopTo, nearestNeighbor, findBisector);
    } else {
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
function checkForOphans(trapper, trapped, goUp, findBisector) {

    return trapped.bisectors.filter(function (bisector) {
        var hopTo = findHopTo(bisector, trapped);
        return goUp === hopTo.site[1] < trapped.site[1] && isBisectorTrapped(trapper, bisector);
    }).sort(function (a, b) {

        var hopToA = findHopTo(a, trapped);
        var hopToB = findHopTo(b, trapped);

        var mergeLineA = findBisector(hopToA, trapper);
        var mergeLineB = findBisector(hopToB, trapper);

        var extremeA = getExtremePoint(mergeLineA, goUp);
        var extremeB = getExtremePoint(mergeLineB, goUp);

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
function curryFindBisector(callback, width, height) {
    return function (P1, P2) {
        return callback(P1, P2, width, height);
    };
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
function findL1Bisector(P1, P2, width, height) {

    var xDistance = P1.site[0] - P2.site[0];
    var yDistance = P1.site[1] - P2.site[1];

    var midpoint = [(P1.site[0] + P2.site[0]) / 2, (P1.site[1] + P2.site[1]) / 2];

    var slope = yDistance / xDistance > 0 ? -1 : 1;

    var intercetpt = midpoint[1] - midpoint[0] * slope;

    var vertexes = [];
    var up = null;

    // special case 
    if (Math.abs(xDistance) === Math.abs(yDistance)) {
        console.warn("square bisector");

        var internalPoints = [[(P1.site[1] - intercetpt) / slope, P1.site[1]], [(P2.site[1] - intercetpt) / slope, P2.site[1]]];

        var byHeight = [P1, P2].sort(function (a, b) {
            return a.site[1] - b.site[1];
        });
        var sortedVerts = internalPoints.sort(function (a, b) {
            return a[1] - b[1];
        });

        vertexes = [{
            site: byHeight[0],
            sites: [P1, P2],
            points: [[sortedVerts[0][0], 0]].concat(_toConsumableArray(sortedVerts), [[slope === -1 ? 0 : width, sortedVerts[1][1]]]),
            compound: false,
            intersections: []
        }, {
            site: byHeight[1],
            sites: [P1, P2],
            points: [[slope === -1 ? width : 0, sortedVerts[0][1]]].concat(_toConsumableArray(sortedVerts), [[sortedVerts[1][0], height]]),
            compound: false,
            intersections: []
        }];

        return { sites: [P1, P2], up: true, points: vertexes, intersections: [], compound: true };
    }

    if (Math.abs(xDistance) === 0) {
        vertexes = [[0, midpoint[1]], [width, midpoint[1]]];

        return { sites: [P1, P2], up: false, points: vertexes, intersections: [], compound: false };
    }

    if (Math.abs(yDistance) === 0) {
        vertexes = [[midpoint[0], 0], [midpoint[0], height]];

        return { sites: [P1, P2], up: true, points: vertexes, intersections: [], compound: false };
    }
    if (Math.abs(xDistance) > Math.abs(yDistance)) {
        vertexes = [[(P1.site[1] - intercetpt) / slope, P1.site[1]], [(P2.site[1] - intercetpt) / slope, P2.site[1]]];

        up = true;
    } else {
        vertexes = [[P1.site[0], P1.site[0] * slope + intercetpt], [P2.site[0], P2.site[0] * slope + intercetpt]];

        up = false;
    }

    var bisector = { sites: [P1, P2], up: up, points: [], intersections: [], compound: false };

    if (up) {
        var _sortedVerts = vertexes.sort(function (a, b) {
            return a[1] - b[1];
        });

        bisector.points = [[_sortedVerts[0][0], 0]].concat(_toConsumableArray(_sortedVerts), [[_sortedVerts[1][0], height]]).sort(function (a, b) {
            return a[1] - b[1];
        });
    } else {
        var _sortedVerts2 = vertexes.sort(function (a, b) {
            return a[0] - b[0];
        });

        bisector.points = [[0, _sortedVerts2[0][1]]].concat(_toConsumableArray(_sortedVerts2), [[width, _sortedVerts2[1][1]]]).sort(function (a, b) {
            return a[0] - b[0];
        });
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
function clearOutOrphans(orphanage, trapPoint) {
    return orphanage.bisectors.filter(function (bisector) {
        return !isBisectorTrapped(trapPoint, bisector);
    });
}

/**
 * Finds other point across a bisector
 * 
 * @param {Bisector} bisector 
 * @param {Site} hopFrom
 * @returns {Site} 
 */
function findHopTo(bisector, hopFrom) {
    return bisector.sites.find(function (e) {
        return e !== hopFrom;
    });
}

/**
 * Find L1 distance
 * 
 * @param {Array} P1 in form [x,y] 
 * @param {Array} P2 in form [x,y]
 * @returns {number}
 */
function distance(P1, P2) {
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
function isBisectorTrapped(trapPoint, bisector) {
    if (!bisector.compound) {
        return bisector.points.every(function (point) {
            return distance(trapPoint.site, point) <= distance(bisector.sites[0].site, point) && distance(trapPoint.site, point) <= distance(bisector.sites[1].site, point);
        });
    } else {
        return isBisectorTrapped(trapPoint, bisector.points[0]) && isBisectorTrapped(trapPoint, bisector.points[1]);
    }
}

/**
 * Find the highest or lowest point of a potential bisector.
 * 
 * @param {Bisector} bisector 
 * @param {boolean} goUp 
 */
function getExtremePoint(bisector, goUp) {
    if (!bisector.compound) {
        return bisector.points.reduce(function (c, e) {
            return goUp ? Math.max(e[1], c) : Math.min(e[1], c);
        }, goUp ? -Infinity : Infinity);
    } else {
        return bisector.points.map(function (e) {
            return getExtremePoint(e, goUp);
        }).sort(function (a, b) {
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
function trimBisector(target, intersector, passedIntersection, backtrim) {

    if (!target.compound && !intersector.compound) {

        var intersection = bisectorIntersection(target, intersector);

        if (!intersection && backtrim) {
            console.log(intersection, target, intersector);
            return;
        }

        var newPoints = target.points.reduce(function (c, e, i, array) {
            if (i + 1 >= array.length) {
                return c;
            }
            //console.log(array[i+1], array, i);
            if (distance(e, intersection) + distance(array[i + 1], intersection) === distance(e, array[i + 1])) {
                return [].concat(_toConsumableArray(c), [e, intersection]);
            } else {
                return [].concat(_toConsumableArray(c), [e]);
            }
        }, []);

        // add the last one
        newPoints = [].concat(_toConsumableArray(newPoints), [target.points[target.points.length - 1]]);

        var polygonSite = intersector.sites.find(function (e) {
            return target.sites.find(function (d) {
                return d === e;
            }) === undefined;
        });
        target.intersections.push(intersection);
        target.points = newPoints.filter(function (e) {
            return distance(e, target.sites[0].site) <= distance(e, polygonSite.site) || distance(e, target.sites[1].site) <= distance(e, polygonSite.site) || samePoint(e, intersection);
        });
    } else if (!target.compound && intersector.compound) {
        //console.log("intersector compound", target, intersector);
        trimBisector(target, intersector.points[0]);
        trimBisector(target, intersector.points[1]);
    } else if (target.compound && !intersector.compound) {
        //console.log("target compound", target, intersector);        
        trimBisector(target.points[0], intersector);
        trimBisector(target.points[1], intersector);
    } else {
        //console.log("both compound", target, intersector);
        trimBisector(target.points[0], intersector[0]);
        trimBisector(target.points[0], intersector[1]);
        trimBisector(target.points[1], intersector[0]);
        trimBisector(target.points[1], intersector[1]);
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
function isNewBisectorUpward(hopTo, hopFrom, site, goUp) {

    var slope = (hopTo.site[1] - site.site[1]) / (hopTo.site[0] - site.site[0]);
    var intercept = hopTo.site[1] - slope * hopTo.site[0];

    // this needs to be here to account for bisectors 
    if (Math.abs(slope) === Infinity) {
        //console.log("verticle slope :/");
        //console.log( "Hop From:",hopFrom.site, "Hop to:", hopTo.site, "site:",site.site, "is upward", site.site[1] < hopTo.site[1] );
        return site.site[1] > hopTo.site[1];
    }

    var isAboveLine = hopFrom.site[1] > slope * hopFrom.site[0] + intercept;

    return isAboveLine;
}

/**
 * Find intersection of two bisectors, if it exists
 * 
 * @param {Bisector} B1 
 * @param {Bisector} B2
 * @returns {Array or boolean} 
 */
function bisectorIntersection(B1, B2, anchor) {
    if (B1 === B2) {
        return false;
    }
    // simple case, if they're both not compound
    if (!B1.compound && !B2.compound) {
        //console.log(B1, B2);
        for (var i = 0; i < B1.points.length - 1; i++) {
            for (var j = 0; j < B2.points.length - 1; j++) {
                var intersect = segementIntersection([B1.points[i], B1.points[i + 1]], [B2.points[j], B2.points[j + 1]], i, j);

                if (intersect) {
                    return intersect;
                }
            }
        }
    }
    // if one is compound
    else if (!B1.compound || !B2.compound) {
            var compound = [B1, B2].find(function (e) {
                return e.compound;
            });
            var notCompound = [B1, B2].find(function (e) {
                return !e.compound;
            });

            var intersections = compound.points.map(function (e) {
                return bisectorIntersection(e, notCompound);
            }).filter(function (e) {
                return e;
            }).sort(function (a, b) {
                return distance(a, anchor) - distance(b, anchor);
            });

            return intersections.length > 0 ? intersections[0] : false;
        }
        // if both are compound
        else {

                var _intersections = B2.points.map(function (d) {

                    var innerIntersections = B1.points.map(function (e) {
                        return bisectorIntersection(e, d);
                    }).filter(function (e) {
                        return e;
                    }).sort(function (a, b) {
                        return distance(a, anchor) - distance(b, anchor);
                    });

                    return innerIntersections.length > 0 ? innerIntersections[0] : false;
                }).filter(function (e) {
                    return e.intersection;
                }).sort(function (a, b) {
                    return distance(a, anchor) - distance(b, anchor);
                });

                return _intersections.length > 0 ? _intersections[0] : false;
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
function segementIntersection(L1, L2) {

    var ua,
        ub,
        denom = (L2[1][1] - L2[0][1]) * (L1[1][0] - L1[0][0]) - (L2[1][0] - L2[0][0]) * (L1[1][1] - L1[0][1]);

    // If denom is zero, that mean that both segemnts are verticle or horizontal, and we need to account for that.
    if (denom == 0) {
        return null;
    }
    ua = ((L2[1][0] - L2[0][0]) * (L1[0][1] - L2[0][1]) - (L2[1][1] - L2[0][1]) * (L1[0][0] - L2[0][0])) / denom;
    ub = ((L1[1][0] - L1[0][0]) * (L1[0][1] - L2[0][1]) - (L1[1][1] - L1[0][1]) * (L1[0][0] - L2[0][0])) / denom;

    if (!(ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1)) {
        return false;
    }

    return [L1[0][0] + ua * (L1[1][0] - L1[0][0]), L1[0][1] + ua * (L1[1][1] - L1[0][1])];
}

/**
 * Determine if two points are the same point
 * 
 * @param {Array} P1 - in form [x,y] 
 * @param {Array} P2 - in form [x,y]
 */
function samePoint(P1, P2) {
    return P1[0] === P2[0] && P1[1] === P2[1];
}

exports.generateVoronoiPoints = generateVoronoiPoints;
exports.generateL1Voronoi = generateL1Voronoi;
//# sourceMappingURL=voronoi.js.map
