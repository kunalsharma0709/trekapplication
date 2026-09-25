import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
import express , {Response,Request, Router} from "express";
import axios from "axios";
import { authMiddleware } from "../middlewares/authmidd";
import sharp from 'sharp';
const router = express.Router();
enum Status {
  Success = 200,
  NotFound = 404,
  ServerError = 500,
  BadRequest = 400
}  


function latLonToTile(lat:number, lon : number, zoom : number) {
    const x = Math.floor((lon + 180) / 360 * Math.pow(2, zoom));
    const y = Math.floor(
        (1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom)
    );
    return { x, y };
}


/// this route is for the offline map purposes
router.get("/maps/:place",async(req:Request,res:Response)=>{
  
  const place = req.params.place
  const zoom:number=12;
 

  const response = await axios.get(`https://nominatim.openstreetmap.org/search?q=${place}&format=json&limit=1&polygon_geojson=1&addressdetails=1`,{
    headers:{
        "User-Agent": "MyTrekApp/1.0 (kunalsharmahp07@gmail.com)"
    }
  });

  const bbox = response.data[0].boundingbox;
  const north = parseFloat(bbox[1]);
  const south = parseFloat(bbox[0]);
  const east = parseFloat(bbox[3]);
  const west = parseFloat(bbox[2]);

  const  nw = latLonToTile(north,west,zoom);
  const se = latLonToTile(south,east,zoom);
  

  const tileWidth = 256;
        const tileHeight = 256;
        const width = (se.x - nw.x + 1) * tileWidth;
        const height = (se.y - nw.y + 1) * tileHeight;

 const promises = [];

 for ( let x= nw.x ; x <= se.x;x++){
    for (let y=nw.y ; y<=se.y;y++){

        promises.push(
            axios.get(`https://tile.openstreetmap.org/${zoom}/${x}/${y}.png`,{responseType:"arraybuffer"}).then(imageres => ({
                        input: Buffer.from(imageres.data),
                        top: (y - nw.y) * tileHeight,
                        left: (x - nw.x) * tileWidth
                    }))
        )
    }
 }

  const finalmap = await Promise.all(promises);

        // Step 4: Stitch tiles into one image
        const buffer = await sharp({
            create: {
                width,
                height,
                channels: 3,
                background: { r: 255, g: 255, b: 255 }
            }
        })
            .composite(finalmap)
            .png()
            .toBuffer();

        res.setHeader("Content-Type", "image/png");
        res.send(buffer);

})



//this route is to get all the nodes on the trek and find out the distance of the trek with the help of haversine function which calculates the distance b/w the two nodes


router.get("/treks/:place", async (req: Request, res: Response) => {
  try {
    const { place } = req.params;

    // 1️⃣ Get bounding box from Nominatim
    const geoRes = await axios.get(
      `https://nominatim.openstreetmap.org/search?q=${place}&format=json&limit=1`
    );
    
    if (!geoRes.data.length) {
      return res.status(404).json({ error: "Place not found" });
    }

    const bbox = geoRes.data[0].boundingbox; // [south, north, west, east]
    const south = parseFloat(bbox[0]);
    const north = parseFloat(bbox[1]);
    const west = parseFloat(bbox[2]);
    const east = parseFloat(bbox[3]);
    
    // 2️⃣ Query trek paths from Overpass
    const query = `
      [out:json];
      (
        way["highway"~"path|footway|track|steps"](${south},${west},${north},${east});
        relation["route"~"hiking|foot"](${south},${west},${north},${east});
      );
      (._;>;);
      out body;
    `;
   
    const overpassRes = await axios.post(
      "https://overpass-api.de/api/interpreter",
      query,
      { headers: { "Content-Type": "text/plain" } }
    );

    const elements = overpassRes.data.elements;
    if (!elements || elements.length === 0) {
      return res.json({ msg: "No trek paths found" });
    }

    // 3️⃣ Build a lookup table of nodeId -> coordinates
    const nodesMap: Record<string, [number, number]> = {};
    elements
      .filter((el: any) => el.type === "node")
      .forEach((n: any) => {
        nodesMap[n.id] = [n.lat, n.lon];
      });

    // 4️⃣ Extract ways with ordered coordinates
    const paths = elements
      .filter((el: any) => el.type === "way" && el.nodes)
      .map((way: any) => way.nodes.map((id: number) => nodesMap[id]))
      .filter((coords: any) => coords.length > 1); // skip empty

    if (paths.length === 0) {
      return res.json({ msg: "No trek paths found" });
    }

    // ✅ Response
    res.json({
      place,
      bbox: { south, west, north, east },
      center: {
        lat: (south + north) / 2,
        lon: (west + east) / 2,
      },
      paths, // array of polylines, each = [[lat, lon], [lat, lon], ...]
    });
  } catch (err: any) {
    console.error("Backend trek error:", err.message);
    res.status(500).json({ error: "Something went wrong", details: err.message });
  }
});
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function haversineDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371; // Radius of Earth in km
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in km
}

function getIntervalPoints(path: [number, number][], intervalKm: number): [number, number][] {
  let result: [number, number][] = [];
  let distAcc = 0;

  for (let i = 0; i < path.length - 1; i++) {
    const [lat1, lon1] = path[i];
    const [lat2, lon2] = path[i + 1];

    const segmentDist = haversineDistance(lat1, lon1, lat2, lon2);

    distAcc += segmentDist;

    if (distAcc >= intervalKm) {
      result.push([lat2, lon2]);
      distAcc = 0;
    }
  }

  return result;
}

async function getWeather(lat: number, lon: number) {
  const API_KEY = process.env.OPENWEATHER_API_KEY!;
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`;
  const res = await axios.get(url);
  return res.data; // contains current weather
}  





//now we are creating the function to fetch the weather of the place for next full week
router.get("/weather/:place",async(req:Request,res:Response)=>{
  const place =req.params.place;
  const nominatimres = await axios.get(`https://nominatim.openstreetmap.org/search?q=${place}&format=json&limit=1`);
  if(nominatimres.data.length==0){
              return res.json({
                msg:"place not found"
              })
  }

  const bbox = nominatimres.data[0].boundingbox;
  const north =parseFloat(bbox[1]);
  const south =parseFloat(bbox[0]);
  const east = parseFloat(bbox[3]);
  const west = parseFloat(bbox[2]);

  // 2️⃣ Query trek paths from Overpass
    const query = `
      [out:json];
      (
        way["highway"~"path|footway|track|steps"](${south},${west},${north},${east});
        relation["route"~"hiking|foot"](${south},${west},${north},${east});
      );
      (._;>;);
      out body;
    `;

    const overpassres =await  axios.post("https://overpass-api.de/api/interpreter",
      query
    ,{
      headers:{
        "Content-Type":"text/plain"
      }
    });

    const elements  = overpassres.data.elements;
    if(!elements || elements.length===0){
      return res.json({
        msg:"no trek found here"
      })
    }

   

     const nodesMap: Record<string, [number, number]> = {};
    elements
      .filter((el: any) => el.type === "node")
      .forEach((n: any) => {
        nodesMap[n.id] = [n.lat, n.lon];
      });

    // 4️⃣ Extract ways with ordered coordinates
    const paths = elements
      .filter((el: any) => el.type === "way" && el.nodes)
      .map((way: any) => way.nodes.map((id: number) => nodesMap[id]))
      .filter((coords: any) => coords.length > 1); // skip empty
     const trekPath = paths[0];

  // 4. Generate interval points every 2 km
  const intervalPoints = getIntervalPoints(trekPath, 2);

  // 5. Fetch weather for each interval point
  const weatherData = [];
  for (const [lat, lon] of intervalPoints) {
    const weather = await getWeather(lat, lon);
    weatherData.push({ lat, lon, forecast: weather.daily }); // full week forecast
  }   

  return res.json({
    place,
    intervals: intervalPoints,
    weatherAlongTrail: weatherData,
  });
});





export default router;
