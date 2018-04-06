(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict";

var _voronoi = require("./src/voronoi.js");

var main = document.getElementById("main");
var diagram = document.getElementById("diagram");
var mergeProcess = document.getElementById("merge-process");
var width = 400;
var height = 400;
diagram.setAttribute("height", height);
diagram.setAttribute("width", width);
mergeProcess.setAttribute("height", height);
mergeProcess.setAttribute("width", width);

function randomNormal(sharpness) {
    return new Array(sharpness).fill(0).map(function (e) {
        return Math.random();
    }).reduce(function (c, e) {
        return c + e;
    }, 0) / sharpness;
}

var raw = new Array(128).fill(0).map(function (e) {
    return [Math.floor(randomNormal(2) * width), Math.floor(randomNormal(2) * height)];
});
var sites = raw.slice(0);

document.getElementById("points").textContent = JSON.stringify(sites.sort(function (a, b) {
    if (a[0] !== b[0]) {
        return a[0] - b[0];
    } else {
        return a[1] - b[1];
    }
}), null);

var vectorPoints = (0, _voronoi.generateL1Voronoi)(sites, width, height, true);
console.log(vectorPoints);
// draw svg shapes
vectorPoints.forEach(function (site) {

    site.bisectors.forEach(function (bisector) {
        var newElement = document.createElementNS("http://www.w3.org/2000/svg", 'polyline'); //Create a path in SVG's namespace
        newElement.setAttribute("points", bisector.points.map(function (e) {
            return e.join(",");
        }).join(" ")); //Set path's data
        newElement.setAttribute("parents", bisector.sites.map(function (e) {
            return e.site.join(",");
        }).join(" | "));
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
    siteCirc.setAttribute("r", 1); //Set path's data
    siteCirc.style.fill = "#000"; //Set stroke colour
    mergeProcess.appendChild(siteCirc);

    var siteCirc = document.createElementNS("http://www.w3.org/2000/svg", 'circle'); //Create a path in SVG's namespace
    siteCirc.setAttribute("cx", site.site[0]); //Set path's data
    siteCirc.setAttribute("cy", site.site[1]); //Set path's data
    siteCirc.setAttribute("r", 1); //Set path's data
    siteCirc.style.fill = "#000"; //Set stroke colour
    diagram.appendChild(siteCirc);
});

function getColor(color) {
    switch (color) {
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
        case 256:
            return "#993300";
            break;
        case 512:
            return "#669999";
            break;
        case 1024:
            return "#800000";
            break;
        case 2048:
            return "#333300";
            break;
        default:
            return "#000000";
    }
}

//main.textContent = JSON.stringify(vectorPoints, null, 4);

},{"./src/voronoi.js":2}],2:[function(require,module,exports){
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
        var closest = colors.reduce(function (c, e) {

            if (Array.isArray(c)) {
                return c.every(function (d) {
                    return distanceCallback(d.point, coordinate) < distanceCallback(e.point, coordinate);
                }) ? c : e;
            } else if (distanceCallback(c.point, coordinate) === distanceCallback(e.point, coordinate)) {
                return [c, e];
            } else {
                return distanceCallback(c.point, coordinate) < distanceCallback(e.point, coordinate) ? c : e;
            }
        }, { point: [Infinity, Infinity] });

        return Array.isArray(closest) ? [0, 0, 0] : closest.color;
    });

    return imageData;
};

/**
 * Nudge points to hopefully eliminate square bisectors
 * 
 * @param {Array<[x,y]>} data 
 */
function cleanData(data) {
    data.forEach(function (e, i) {
        data.forEach(function (d, j) {
            if (i !== j && Math.abs(d[0] - e[0]) === Math.abs(d[1] - e[1])) {
                d[0] = d[0] + 1e-10 * d[1];
                d[1] = d[1] + 2e-10 * d[0];
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

function generateL1Voronoi(sitePoints, width, height) {
    var nudgeData = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : true;


    if (nudgeData) {
        console.log("nudging data");
        sitePoints = cleanData(sitePoints);
    }

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

    return graph.map(function (site) {

        site.polygonPoints = site.bisectors.reduce(function (total, bisector, index, bisectors) {

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

                return {
                    points: [].concat(_toConsumableArray(total.points), _toConsumableArray(nextPoints)),
                    used: [].concat(_toConsumableArray(total.used), [nextBisector])
                };
            }
        }, {}).points;

        var corners = [[0, 0], [width, 0], [width, height], [0, height]];

        // finally we need to catch if it ends one an edge
        if (isPointonEdge(site.polygonPoints[0]) && isPointonEdge(site.polygonPoints[site.polygonPoints.length - 1]) && !arePointsOnSameEdge(site.polygonPoints[0], site.polygonPoints[site.polygonPoints.length - 1])) {

            var filteredCorners = corners.filter(function (e) {
                return site.bisectors.every(function (d) {
                    return !bisectorIntersection({ points: [e, site.site] }, d);
                });
            });

            site.polygonPoints = [].concat(_toConsumableArray(site.polygonPoints), _toConsumableArray(filteredCorners));
        }

        site.polygonPoints = site.polygonPoints.sort(function (a, b) {
            return angle(site.site, a) - angle(site.site, b);
        });

        site.d = "M " + site.polygonPoints.map(function (e) {
            return e.join(" ");
        }).join(" L") + " Z";

        site.neighbors = site.bisectors.map(function (e) {
            return findHopTo(e, site.site).site;
        });

        return site;
    });

    function isPointonEdge(point) {
        return point[0] === 0 || point[0] === width || point[1] === 0 || point[1] === height;
    }

    function arePointsOnSameEdge(P1, P2) {
        return P1[0] === P2[0] && P1[0] === 0 || P1[0] === P2[0] && P1[0] === width || P1[1] === P2[1] && P1[1] === 0 || P1[1] === P2[1] && P1[1] === height;
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

        trimBisector(currentBisector, crossedBorder, currentCropPoint);

        mergeArray.push(currentBisector);
    }

    var cropLArray = currentL.bisectors.map(function (e) {
        return { bisector: e, point: bisectorIntersection(currentBisector, e) };
    }).filter(function (e) {
        var hopTo = e.bisector.sites.find(function (d) {
            return d !== currentL;
        });
        return e.point && goUp === isNewBisectorUpward(hopTo, currentL, currentR, goUp) && (!samePoint(e.point, currentCropPoint) || e.bisector !== crossedBorder);
    }).sort(function (a, b) {
        return angle(currentL.site, findHopTo(b.bisector, currentL).site) - angle(currentL.site, findHopTo(a.bisector, currentL).site);
    }).filter(function (e, i, candidates) {
        var hopTo = findHopTo(e.bisector, currentL);
        var newMergeLine = findBisector(currentR, hopTo);
        trimBisector(newMergeLine, e.bisector, e.point);
        return candidates.every(function (d) {
            return !isBisectorTrapped(findHopTo(d.bisector, currentL), newMergeLine) || findHopTo(d.bisector, currentL) === hopTo;
        });
    });

    var cropRArray = currentR.bisectors.map(function (e) {
        return { bisector: e, point: bisectorIntersection(currentBisector, e) };
    }).filter(function (e) {
        var hopTo = e.bisector.sites.find(function (d) {
            return d !== currentR;
        });
        return e.point && goUp === isNewBisectorUpward(hopTo, currentR, currentL, goUp) && (!samePoint(e.point, currentCropPoint) || e.bisector !== crossedBorder);
    }).sort(function (a, b) {
        return angle(currentR.site, findHopTo(a.bisector, currentR).site) - angle(currentR.site, findHopTo(b.bisector, currentR).site);
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

    // determine which point  
    if (determineFirstBorderCross(cropR, cropL, currentCropPoint) === "right") {
        trimBisector(cropR.bisector, currentBisector, cropR.point);
        trimBisector(currentBisector, cropR.bisector, cropR.point);
        currentBisector.intersections.push(cropR.point);
        crossedBorder = cropR.bisector;
        currentR = cropR.bisector.sites.find(function (e) {
            return e !== currentR;
        });
        currentCropPoint = cropR.point;
    } else if (determineFirstBorderCross(cropR, cropL, currentCropPoint) === "left") {
        trimBisector(cropL.bisector, currentBisector, cropL.point);
        trimBisector(currentBisector, cropL.bisector, cropL.point);
        currentBisector.intersections.push(cropL.point);
        crossedBorder = cropL.bisector;
        currentL = cropL.bisector.sites.find(function (e) {
            return e !== currentL;
        });
        currentCropPoint = cropL.point;
    } else {
        trimBisector(cropR.bisector, currentBisector, cropR.point);
        trimBisector(currentBisector, cropR.bisector, cropR.point);
        currentBisector.intersections.push(cropR.point);
        crossedBorder = cropR.bisector;
        currentR = cropR.bisector.sites.find(function (e) {
            return e !== currentR;
        });
        currentCropPoint = cropR.point;

        trimBisector(cropL.bisector, currentBisector, cropL.point);
        trimBisector(currentBisector, cropL.bisector, cropL.point);
        currentBisector.intersections.push(cropL.point);
        crossedBorder = cropL.bisector;
        currentL = cropL.bisector.sites.find(function (e) {
            return e !== currentL;
        });
        currentCropPoint = cropL.point;
    }

    return walkMergeLine(currentR, currentL, currentBisector, currentCropPoint, goUp, crossedBorder, mergeArray, findBisector);
}

function angle(P1, P2) {
    var angle = Math.atan2(P2[1] - P1[1], P2[0] - P1[0]);

    if (angle < 0) {
        angle = Math.PI + Math.PI + angle;
    }

    return angle;
}

function determineFirstBorderCross(cropR, cropL, currentCropPoint) {
    if (Math.abs(cropR.point[1] - currentCropPoint[1]) === Math.abs(cropL.point[1] - currentCropPoint[1])) {
        return null;
    } else {
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
function determineStartingBisector(w, nearestNeighbor, width) {
    var lastIntersect = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : null;
    var findBisector = arguments[4];


    var z = [width, w.site[1]];

    if (!lastIntersect) {
        lastIntersect = w.site;
    }

    var zline = { points: [w.site, z] };

    var intersection = nearestNeighbor.bisectors.map(function (bisector) {
        return { point: bisectorIntersection(zline, bisector), bisector: bisector };
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

    if (Math.abs(xDistance) === Math.abs(yDistance)) {
        throw new Error("Square bisector: Points " + JSON.stringify(P1) + " and " + JSON.stringify(P2) + " are points on a square \n            (That is, their vertical distance is equal to their horizontal distance). Consider using the nudge points function or set the nudge data flag.");
    }

    if (samePoint(P1.site, P2.site)) {
        throw new Error("Duplicate point: Points " + JSON.stringify(P1) + " and " + JSON.stringify(P2) + " are duplicates. please remove one");
    }

    if (Math.abs(xDistance) === 0) {
        vertexes = [[0, midpoint[1]], [width, midpoint[1]]];

        return { sites: [P1, P2], up: false, points: vertexes, intersections: [], compound: false };
    }

    if (Math.abs(yDistance) === 0) {
        vertexes = [[midpoint[0], 0], [midpoint[0], height]];

        return { sites: [P1, P2], up: true, points: vertexes, intersections: [], compound: false };
    }
    if (Math.abs(xDistance) >= Math.abs(yDistance)) {
        vertexes = [[(P1.site[1] - intercetpt) / slope, P1.site[1]], [(P2.site[1] - intercetpt) / slope, P2.site[1]]];

        up = true;
    } else {
        vertexes = [[P1.site[0], P1.site[0] * slope + intercetpt], [P2.site[0], P2.site[0] * slope + intercetpt]];

        up = false;
    }

    var bisector = { sites: [P1, P2], up: up, points: [], intersections: [], compound: false };

    if (up) {
        var sortedVerts = vertexes.sort(function (a, b) {
            return a[1] - b[1];
        });

        bisector.points = [[sortedVerts[0][0], 0]].concat(_toConsumableArray(sortedVerts), [[sortedVerts[1][0], height]]).sort(function (a, b) {
            return a[1] - b[1];
        });
    } else {
        var _sortedVerts = vertexes.sort(function (a, b) {
            return a[0] - b[0];
        });

        bisector.points = [[0, _sortedVerts[0][1]]].concat(_toConsumableArray(_sortedVerts), [[width, _sortedVerts[1][1]]]).sort(function (a, b) {
            return a[0] - b[0];
        });
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
    return bisector.points.every(function (point) {
        return distance(trapPoint.site, point) <= distance(bisector.sites[0].site, point) && distance(trapPoint.site, point) <= distance(bisector.sites[1].site, point);
    });
}

/**
 * Find the highest or lowest point of a potential bisector.
 * 
 * @param {Bisector} bisector 
 * @param {boolean} goUp 
 */
function getExtremePoint(bisector, goUp) {
    return bisector.points.reduce(function (c, e) {
        return goUp ? Math.max(e[1], c) : Math.min(e[1], c);
    }, goUp ? -Infinity : Infinity);
}

/**
 * Trim a bisector at a particular point, discarding the points lying within the other polygon
 * 
 * @param {Bisector} target 
 * @param {Bisector} intersector 
 * @param {Array} intersection in form [x,y] 
 */
function trimBisector(target, intersector, intersection) {

    var polygonSite = intersector.sites.find(function (e) {
        return target.sites.find(function (d) {
            return d === e;
        }) === undefined;
    });

    var newPoints = target.points.filter(function (e) {
        return distance(e, target.sites[0].site) < distance(e, polygonSite.site) && distance(e, target.sites[1].site) < distance(e, polygonSite.site);
    });

    newPoints.push(intersection);

    target.points = newPoints.sort(function (a, b) {
        if (target.up) {
            return a[1] - b[1];
        } else {
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
function isNewBisectorUpward(hopTo, hopFrom, site, goUp) {

    var slope = (hopTo.site[1] - site.site[1]) / (hopTo.site[0] - site.site[0]);
    var intercept = hopTo.site[1] - slope * hopTo.site[0];

    // this needs to be here to account for bisectors 
    if (Math.abs(slope) === Infinity) {
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
function bisectorIntersection(B1, B2) {
    if (B1 === B2) {
        return false;
    }
    for (var i = 0; i < B1.points.length - 1; i++) {
        for (var j = 0; j < B2.points.length - 1; j++) {
            var intersect = segementIntersection([B1.points[i], B1.points[i + 1]], [B2.points[j], B2.points[j + 1]], i, j);

            if (intersect) {
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
exports.cleanData = cleanData;

},{}]},{},[1])//# sourceMappingURL=build.js.map
