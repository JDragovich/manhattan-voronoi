# Manhattan Voronoi

A library for generating L1 (Manhattan distance) Voronoi diagrams

See the [Demo Page](http://voronoi.joe-dragovich.co.uk.s3-website.eu-west-2.amazonaws.com/)

## What is a Manhattan Voronoi diagram?

As defined by Wikipedia a Voronoi diagram is:

>In mathematics, a Voronoi diagram is a partitioning of a plane into regions based on distance to points in a specific subset of the plane.

In other words, a Voronoi cell contains all of the points in a plane that are closer to a site then any other site. Unlike most Voronoi digrams, which use the L2 (Euclidean distance) metric, Manhanttan distance Voronoi digrams use the L1 metric. This creates cells that have kinked edges and strange protusions. In short, they just look cool!

for more information on metrics in mathematics see [Wikipedia](https://en.wikipedia.org/wiki/Metric_(mathematics)).

## What is this for?

This library is an implementation of Lee and Wong's algorithm for generating L1 Voronoi and provides a more performant alternative to checking every point on a plane. 

This library also returns the Voronoi polygon points, which are useful for display as vector graphics.

## API Reference

**generateL1Voronoi(sitePoints, width, height, nudgeData)**

* **@param {array} sitePoints** - an array of points in the form [x,y]
* **@param {number} width** - integer width of the graph area
* **@param {number} height** - integer height of the graph area 
* **@param {boolean} nudgeData** - flag for whether to automatically nudge points that are invalid pairs (either duplicate points or points on a square). Enabled by default. Turning this off will make the graph generation more performant, but runs the risk of throwing errors for points on a square or duplicate points. 
* **@returns {Array\<Site>}** return array of site objects with the following properties.
    - **@param {Array\<Bisectors>} bisectors** - Array of bisectors for the site, which are the individual borders with other sites
    - **@param {Array<x,y>} site** - the coordinate of the site
    - **@param {Array<Array<x,y>>} polygonPoints** - the raw points of the polygon coordinates
    - **@param {string} d** - the SVG path data for the polygon
    - **@param {Array<Array<x,y>>} neighbors** - Array of adjacent sites

## Is this an accurate diagram?

The diagrams generated by this library are accurate with a few caveats:
1. This library does not handle points on a square (See Lee and Wong article for a more thorough explanation.)
2. It also does not handle duplicate points.

It handles these situations by cleaning the input points to move them slightly out of the above situations. These moves are small but will ensure successful graph generation. These nudges should create graphs sufficient for most use cases, but if you're looking for an absolutely mathematically accurate graph, you're better off using an alternative method.

## Example Usage

~~~ javascript
import {generateVoronoiPoints, generateL1Voronoi, cleanData} from "manhattan-Voronoi";

let sites  = [[4,6], [3,10], [10,6], [1,2]];
let width  = 30;
let height = 30;

let vectorPoints = generateL1Voronoi(sites ,width, height, true);
~~~

## Acknowledgements

Thanks to [Gordon Quad](https://github.com/gordon-quad) for his sage mathematical advice, and for pointing me to the original paper.

## Citations

Lee, Der-Tsai, and C. K. Wong. "Voronoui Diagrams in L_1(L_∞) Metrics with 2-Dimensional Storage Applications." SIAM Journal on computing 9, no. 1 (1980): 200-211.

[link](https://epubs.siam.org/doi/abs/10.1137/0209017)
