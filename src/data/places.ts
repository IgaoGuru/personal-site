export interface GridImage {
  src: string;
  row: number;
  col: number;
  rowSpan?: number;  // 1, 2, or 3 (default: 1)
  colSpan?: number;  // 1, 2, or 3 (default: 1)
}

export interface GridObject {
  id: string;
  type: 'place' | 'project';
  title: string;
  description: string;
  link?: string;
  accentColor?: string;
  images: GridImage[];
}

export const GRID_COLUMNS = 4;

export const gridObjects: GridObject[] = [
  {
    id: "rio-2026",
    type: "place",
    title: "Rio",
    description: "Back home. Starting the first tech-native film distribution company of Brazil.",
    accentColor: "#4a90d9",
    images: [
      { src: "/images/places/rio-current.jpg", row: 1, col: 1 },
    ]
  },
  {
    id: "agi-house",
    type: "place",
    title: "AGI House",
    description: "Tried to start a B2B enterprise knowledge-graphs company here. Quit after realizing I didn't want to work on AI B2B SaaS.",
    accentColor: "#9b59b6",
    images: [
      { src: "/images/places/agi-house.jpg", row: 1, col: 2 },
    ]
  },
  {
    id: "sfcs",
    type: "project",
    title: "SF Cybernetics Symposium",
    description: "A small gathering exploring feedback, emergence, and humane technology. I organized this while living in SF.",
    link: "/sfcs",
    accentColor: "#27ae60",
    images: [
      { src: "/images/places/sfcs.png", row: 1, col: 3 },
    ]
  },
  {
    id: "startup-idea",
    type: "project",
    title: "Startup Idea",
    description: "A harness for holding your phone (auto-scroll), cigarette, and zyn dispenser. So you can ride your bike while gooning.",
    accentColor: "#e74c3c",
    images: [
      { src: "/images/places/startup-idea.jpg", row: 2, col: 1 },
    ]
  },
  {
    id: "webmap",
    type: "project",
    title: "Webmap",
    description: "Software for curating blogs. A tool for cherishing writing on the web.",
    link: "https://www.webmap.sh",
    accentColor: "#3498db",
    images: [
      { src: "/images/places/webmap.jpg", row: 2, col: 2 },
    ]
  },
  {
    id: "casa-nautilus",
    type: "place",
    title: "Casa Nautilus",
    description: "A residency for builders and artists in São Paulo. Lived here while exploring what to do next.",
    link: "https://nautilus.quest",
    accentColor: "#1abc9c",
    images: [
      { src: "/images/places/casa-nautilus.jpg", row: 2, col: 3 },
    ]
  },
  {
    id: "teachy",
    type: "project",
    title: "Teachy",
    description: "Founding team at 18. A startup helping k-12 educators in Brazil.",
    link: "https://www.teachy.com",
    accentColor: "#f39c12",
    images: [
      { src: "/images/places/teachy.jpg", row: 3, col: 1 },
    ]
  },
  {
    id: "amd-research",
    type: "place",
    title: "AMD Research",
    description: "Top performing research intern. Built autoencoders for malware detection and image upscaling.",
    accentColor: "#e91e63",
    images: [
      { src: "/images/places/amd-office.jpg", row: 3, col: 2 },
    ]
  },
  {
    id: "illinois",
    type: "place",
    title: "Illinois",
    description: "Moved to the US for college. Did a year of CS before other things called.",
    accentColor: "#ff5722",
    images: [
      { src: "/images/places/illinois.jpg", row: 3, col: 3 },
    ]
  },
  {
    id: "puc-rio",
    type: "place",
    title: "PUC-Rio",
    description: "Research position doing ML for health analytics. Also built what was then the largest videogame computer vision dataset.",
    accentColor: "#607d8b",
    images: [
      { src: "/images/places/puc-rio.jpg", row: 4, col: 1 },
    ]
  },
  {
    id: "sequoia",
    type: "project",
    title: "Sequoia",
    description: "CNNs that learned to play CSGO. My first real ML project.",
    link: "https://github.com/igaoguru/sequoia",
    accentColor: "#8bc34a",
    images: [
      { src: "/images/places/sequoia.jpg", row: 4, col: 2 },
    ]
  },
  {
    id: "rio-childhood",
    type: "place",
    title: "Rio",
    description: "Where I grew up. Teenage years spent obsessing over computer science, computer vision, and computer graphics.",
    accentColor: "#00bcd4",
    images: [
      { src: "/images/places/rio-home.jpg", row: 4, col: 3 },
    ]
  },
];

// Legacy export for compatibility
export type Place = GridObject;
export type PlaceImage = GridImage;
export const places = gridObjects;
