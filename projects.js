const projects = [
  // PHASE 1
  { id: "ironman1", title: "Iron Man", release: "2008-05-02", prerequisites: [], phase: "Phase 1", gridX: 0, gridY: 1, watched: false },
  { id: "ironman2", title: "Iron Man 2", release: "2010-05-07", prerequisites: ["ironman1"], phase: "Phase 1", gridX: 0, gridY: 2, watched: false },
  { id: "hulk", title: "The Incredible Hulk", release: "2008-06-13", prerequisites: ["ironman2"], phase: "Phase 1", gridX: -1, gridY: 3, watched: false },
  { id: "thor1", title: "Thor", release: "2011-05-06", prerequisites: ["ironman2"], phase: "Phase 1", gridX: 0, gridY: 3, watched: false },
  { id: "cap1", title: "Captain America: The First Avenger", release: "2011-07-22", prerequisites: ["ironman2"], phase: "Phase 1", gridX: 1, gridY: 3, watched: false },
  { id: "avengers1", title: "The Avengers", release: "2012-05-04", prerequisites: ["thor1","cap1","hulk"], phase: "Phase 1", gridX: 0, gridY: 4, watched: false },

  // PHASE 2
  { id: "ironman3", title: "Iron Man 3", release: "2013-05-03", prerequisites: ["avengers1"], phase: "Phase 2", gridX: 0, gridY: 1, watched: false },
  { id: "thor2", title: "Thor: The Dark World", release: "2013-11-08", prerequisites: ["avengers1"], phase: "Phase 2", gridX: 1, gridY: 1, watched: false },
  { id: "cap2", title: "Captain America: The Winter Soldier", release: "2014-04-04", prerequisites: ["avengers1"], phase: "Phase 2", gridX: 0, gridY: 2, watched: false },
  { id: "guardians1", title: "Guardians of the Galaxy", release: "2014-08-01", prerequisites: [], phase: "Phase 2", gridX: -1, gridY: 2, watched: false },
  { id: "ageofultron", title: "Avengers: Age of Ultron", release: "2015-05-01", prerequisites: ["ironman3","thor2","cap2","guardians1"], phase: "Phase 2", gridX: 0, gridY: 3, watched: false },
  { id: "antman", title: "Ant-Man", release: "2015-07-17", prerequisites: ["ageofultron"], phase: "Phase 2", gridX: 0, gridY: 4, watched: false },

  // PHASE 3
  { id: "civilwar", title: "Captain America: Civil War", release: "2016-05-06", prerequisites: ["ageofultron","antman"], phase: "Phase 3", gridX: 0, gridY: 1, watched: false },
  { id: "doctorstrange", title: "Doctor Strange", release: "2016-11-04", prerequisites: [], phase: "Phase 3", gridX: 1, gridY: 1, watched: false },
  { id: "guardians2", title: "Guardians of the Galaxy Vol. 2", release: "2017-05-05", prerequisites: ["guardians1"], phase: "Phase 3", gridX: -1, gridY: 2, watched: false },
  { id: "spiderman1", title: "Spider-Man: Homecoming", release: "2017-07-07", prerequisites: ["civilwar"], phase: "Phase 3", gridX: 1, gridY: 2, watched: false },
  { id: "thor3", title: "Thor: Ragnarok", release: "2017-11-03", prerequisites: ["ageofultron"], phase: "Phase 3", gridX: 0, gridY: 3, watched: false },
  { id: "blackpanther", title: "Black Panther", release: "2018-02-16", prerequisites: ["civilwar"], phase: "Phase 3", gridX: -1, gridY: 3, watched: false },
  { id: "infinitywar", title: "Avengers: Infinity War", release: "2018-04-27", prerequisites: ["thor3","blackpanther","spiderman1","guardians2","doctorstrange"], phase: "Phase 3", gridX: 0, gridY: 4, watched: false },
  { id: "antmanwasp", title: "Ant-Man and the Wasp", release: "2018-07-06", prerequisites: ["infinitywar"], phase: "Phase 3", gridX: 1, gridY: 5, watched: false },
  { id: "captainmarvel", title: "Captain Marvel", release: "2019-03-08", prerequisites: [], phase: "Phase 3", gridX: -1, gridY: 5, watched: false },
  { id: "endgame", title: "Avengers: Endgame", release: "2019-04-26", prerequisites: ["infinitywar","antmanwasp","captainmarvel"], phase: "Phase 3", gridX: 0, gridY: 6, watched: false },
  { id: "farfromhome", title: "Spider-Man: Far From Home", release: "2019-07-02", prerequisites: ["endgame"], phase: "Phase 3", gridX: 0, gridY: 7, watched: false }

  // PHASE 4–6 can be added in the same format
];
