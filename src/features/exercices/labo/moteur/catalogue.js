/*
 * Catalogue des graphes des exercices (Labo Graphes 2).
 * Registre repris de contenu/_registre.js du Labo, puis toutes les définitions de contenu/graphes.js.
 * Dans un énoncé ou une correction : [[widget:graphe|g=id]], [[widget:algo|g=id;algo=dijkstra;depart=A]],
 * [[widget:table|g=id;type=...]] (voir widgets-graphes.js). Pour une nouvelle figure, ajouter le graphe ici.
 */
(function () {
  'use strict';
  var ML = {
    graphes: {},
    doublons: [],
    cacheGraphes: {},
    graphe: function (id, def) {
      if (this.graphes[id]) this.doublons.push(id);
      this.graphes[id] = def;
    },
  
    /*
     * Graphe potentiels-tâches construit à partir du tableau des tâches :
     * taches : 'A:4 B:6 C:7' (durées), avant : { B: 'A', E: 'B C' } (tâches pré-requises),
     * sommets : positions 'deb:0,1 A:1,1 ... fin:5,1' (deb et fin sont affichés α et ω).
     * Chaque arc x>y porte la durée de x ; deb>x pour les tâches sans pré-requis, x>fin pour les tâches finales.
     */
    grapheTaches: function (id, def) {
      var durees = {}, ordre = [];
      def.taches.trim().split(/\s+/).forEach(function (t) {
        var m = t.split(':');
        durees[m[0]] = Number(m[1]);
        ordre.push(m[0]);
      });
      var avant = def.avant || {};
      var aSuivant = {};
      var arcs = [];
      ordre.forEach(function (x) {
        var pre = (avant[x] || '').trim().split(/\s+/).filter(Boolean);
        if (!pre.length) arcs.push('deb>' + x + ':0');
        pre.forEach(function (p) {
          if (durees[p] === undefined) throw new Error('Graphe ' + id + ' : tâche pré-requise inconnue ' + p);
          aSuivant[p] = true;
          arcs.push(p + '>' + x + ':' + durees[p] + (def.courbes && def.courbes[p + '>' + x] ? '~' + def.courbes[p + '>' + x] : ''));
        });
      });
      ordre.forEach(function (x) { if (!aSuivant[x]) arcs.push(x + '>fin:' + durees[x]); });
      durees.deb = 0;
      durees.fin = 0;
      this.graphe(id, {
        titre: def.titre,
        oriente: true,
        sommets: def.sommets,
        aretes: arcs.join(' '),
        etiquettes: { deb: 'α', fin: 'ω' },
        ordre: 'deb ' + ordre.join(' ') + ' fin',
        durees: durees,
        taches: ordre,
        avant: avant,
        libelles: def.libelles || null
      });
    },
  
    /* Graphe construit (dictionnaires, arêtes triées), mis en cache. */
    G: function (id) {
      if (!this.graphes[id]) throw new Error('Graphe inconnu : ' + id);
      if (!this.cacheGraphes[id]) this.cacheGraphes[id] = window.Algos.construire(this.graphes[id], id);
      return this.cacheGraphes[id];
    },
  };
  ML.G = ML.G.bind(ML);
  window.ML = ML;
})();

/* ------------------------------------------------ Définitions (contenu/graphes.js du Labo) */
(function (ML) {
  'use strict';
  ML.graphe('dij-cours', {
    titre: 'Cours, exemple 10 (racine c)',
    oriente: true,
    sommets: 'a:1,0 b:2.6,0 c:0,1 d:3.6,1 e:1,2 f:2.6,2',
    aretes: 'c>a:7 c>e:1 e>a:5 a>b:4 a>f:1 d>a:2 d>b:5 e>f:7 e>d:2 f>d:3'
  });

  ML.graphe('td3-g1', {
    titre: 'TD 3, graphe G1 (non orienté)',
    sommets: 'B:1.4,0 C:4.2,0 H:2.8,0.6 A:0,1.2 G:1.4,1.2 D:4.2,1.2 F:1.4,2.4 E:4.2,2.4',
    aretes: 'A-B:5 A-G:16 A-F:7 B-C:4 B-H:7 B-G:13 H-C:2 H-G:3 H-D:3 C-D:4 G-D:7 G-F:8 G-E:11 F-D:15 F-E:19 D-E:4'
  });

  ML.graphe('dij-ex1', {
    titre: 'Réseau de 7 routeurs (orienté)',
    oriente: true,
    sommets: 'R1:0,1 R2:1.5,0 R3:1.5,2 R4:3,1 R5:4.5,0 R6:4.5,2 R7:6,1',
    aretes: 'R1>R2:4 R1>R3:1 R3>R2:2 R2>R4:5 R3>R4:8 R2>R5:10 R4>R5:2 R4>R6:6 R3>R6:12 R5>R7:3 R6>R7:1 R5>R6:1'
  });

  ML.graphe('dij-ex2', {
    titre: 'Graphe avec un sommet inaccessible',
    oriente: true,
    sommets: 'S:0,1 T:1.5,0 U:1.5,2 V:3,0 W:3,2 X:4.5,1',
    aretes: 'S>T:3 S>U:6 T>U:2 T>V:7 U>W:1 W>V:2 V>X:1 W>X:6 X>U:4'
  });

  ML.graphe('dij-neg', {
    titre: 'Contre-exemple : un poids négatif',
    oriente: true,
    sommets: 'A:0,0.6 B:1.6,0 C:1.6,1.2',
    aretes: 'A>B:2 A>C:4 C>B:-3'
  });

  /* ------------------------------------------------------------ Bellman */

  ML.graphe('bk-cours', {
    titre: 'Cours, exemple 12 (avec circuit)',
    oriente: true,
    sommets: '1:0,1 2:1.3,0 3:2.6,0 4:3.9,0 5:3.9,2 6:2.6,2 7:1.3,2',
    aretes: '1>2:2 1>7:4 2>3:1 2>6:2 3>4:2 3>6:-2 3>5:1 4>5:-2 6>7:1 6>5:5 7>2:1'
  });

  ML.graphe('bsc-cours', {
    titre: 'Cours, exercice 15 (sans circuit)',
    oriente: true,
    sommets: '1:0,1 2:1.3,0 3:2.6,0 4:3.9,0 5:3.9,2 6:2.6,2 7:1.3,2',
    aretes: '1>2:2 1>7:4 2>3:1 2>6:2 3>4:2 3>6:-2 3>5:1 4>5:-2 6>7:1 6>5:5'
  });

  ML.graphe('td3-ii', {
    titre: 'TD 3, exercice II',
    oriente: true,
    sommets: 'A:0,1.2 B:1.6,0 C:3.2,1.2 D:1.6,2.4 E:3.2,2.4',
    aretes: 'A>C:3~0.18 C>A:2~0.18 A>D:-5 A>E:-3 B>A:2 C>B:1 D>B:4 E>C:2 E>D:-3'
  });

  ML.graphe('td3-ii-nd', {
    titre: 'TD 3, exercice II (sans orientation)',
    sommets: 'A:0,1.2 B:1.6,0 C:3.2,1.2 D:1.6,2.4 E:3.2,2.4',
    aretes: 'A-C:3~0.18 C-A:2~0.18 A-D:-5 A-E:-3 B-A:2 C-B:1 D-B:4 E-C:2 E-D:-3'
  });

  ML.graphe('td3-iii', {
    titre: 'TD 3, exercice III',
    oriente: true,
    sommets: 'A:0,0 B:3,0 C:1.5,0.8 D:0,1.6 E:3,1.6',
    aretes: 'A>C:8 C>B:2 B>E:3 C>E:4 E>D:-15 C>D:-7 D>A:-2'
  });

  ML.graphe('td3-iii-inv', {
    titre: 'TD 3, exercice III, arc (A, C) inversé',
    oriente: true,
    sommets: 'A:0,0 B:3,0 C:1.5,0.8 D:0,1.6 E:3,1.6',
    aretes: 'C>A:8 C>B:2 B>E:3 C>E:4 E>D:-15 C>D:-7 D>A:-2'
  });

  ML.graphe('bk-ex', {
    titre: 'Graphe à poids négatifs, sans circuit absorbant',
    oriente: true,
    sommets: 'S:0,1 A:1.5,0 B:1.5,2 C:3,0 D:3,2 T:4.5,1',
    aretes: 'S>A:4 S>B:2 B>A:-1 A>C:3 B>D:5 C>D:-4 D>C:6 C>T:2 D>T:1'
  });

  ML.graphe('bsc-ex', {
    titre: 'Graphe sans circuit à 7 sommets',
    oriente: true,
    sommets: 'a:0,1 b:1.4,0 c:1.4,2 d:2.8,0 e:2.8,2 f:4.2,1 g:5.6,1',
    aretes: 'a>b:3 a>c:5 b>c:-2 b>d:4 c>e:3 c>d:6 d>e:-1 d>f:2 e>f:4 f>g:1 e>g:7'
  });

  /* ------------------------------------------------------ Ordonnancement */

  ML.grapheTaches('ordo-cours', {
    titre: 'Cours, exemple 13',
    taches: 'A:30 B:5 C:12 D:17 E:4 F:3 G:14 H:8',
    avant: { B: 'A', C: 'A', D: 'A', E: 'B C', F: 'C', G: 'E F', H: 'D' },
    sommets: 'deb:0,1.2 A:1.2,1.2 B:2.4,0 C:2.4,1.2 D:2.4,2.6 E:3.6,0.2 F:3.6,1.4 G:4.8,0.8 H:3.6,2.6 fin:6,1.2'
  });

  ML.grapheTaches('ordo-td3', {
    titre: 'TD 3, exercice IV',
    taches: 'A:4 B:6 C:7 D:2 E:6 F:7',
    avant: { B: 'A', C: 'A', D: 'B', E: 'B C', F: 'C D' },
    sommets: 'deb:0,1.2 A:1.2,1.2 B:2.4,0.2 C:2.4,2.2 D:3.6,0.2 E:3.6,2.2 F:4.8,1.2 fin:6,1.2'
  });

  ML.grapheTaches('ordo-ex', {
    titre: 'Rénovation d\'un studio',
    taches: 'A:3 B:2 C:4 D:5 E:2 F:3 G:1',
    avant: { C: 'A', D: 'A B', E: 'C', F: 'C D', G: 'E F' },
    libelles: { A: 'démolition', B: 'commande des meubles', C: 'électricité', D: 'plomberie', E: 'peinture', F: 'carrelage', G: 'montage des meubles' },
    sommets: 'deb:0,1.2 A:1.3,0.4 B:1.3,2 C:2.6,0.4 D:2.6,2 E:3.9,0.4 F:3.9,2 G:5.2,1.2 fin:6.4,1.2'
  });

  ML.grapheTaches('vacances', {
    titre: 'TD 3, exercice V (durées maximales)',
    taches: 'A:35 B:7 C:25 D:15 E:5 F:20 G:2 H:1',
    avant: { B: 'A', C: 'A', D: 'B', E: 'A', F: 'A', G: 'C D E', H: 'F G' },
    libelles: { A: 'choisir le lieu', B: 'office du tourisme', C: 'vaccin', D: 'visa', E: 'billets', F: 'valises', G: 'portefeuille', H: 'aéroport' },
    sommets: 'deb:0,1.5 A:1.2,1.5 B:2.4,0 C:2.4,1 E:2.4,2 F:2.4,3 D:3.6,0 G:4.8,1 H:6,1.5 fin:7.2,1.5'
  });

  /* -------------------------------------------------------------- Flots */

  ML.graphe('ff-cours', {
    titre: 'Cours, exemples 16 à 18',
    oriente: true,
    ordre: 's 1 2 3 4 t',
    sommets: 's:0,1.1 1:1.6,0 2:1.6,2.2 3:3.4,0 4:3.4,2.2 t:5,1.1',
    aretes: 's>1:5 s>2:8 1>3:4 1>2:3 2>3:2 4>3:5 2>4:6 3>t:7 4>t:9',
    flot: 's>1:4 s>2:1 1>3:2 1>2:2 2>3:2 4>3:0 2>4:1 3>t:4 4>t:1'
  });

  ML.graphe('td4-eau', {
    titre: 'TD 4, exercice I : châteaux d\'eau',
    oriente: true,
    ordre: 's A B C D E t',
    sommets: 's:0,1.2 A:1.6,0.4 B:1.6,2 C:3.4,0 D:3.4,1.2 E:3.4,2.4 t:5,1.2',
    aretes: 's>A:50 s>B:80 A>C:40 A>D:20 B>D:50 B>E:20 C>t:70 D>t:30 E>t:30',
    flot: 's>A:50 s>B:30 A>C:30 A>D:20 B>D:10 B>E:20 C>t:30 D>t:30 E>t:20'
  });

  ML.graphe('td4-res', {
    titre: 'TD 4, exercice II : réseau de transmission',
    oriente: true,
    ordre: 's A B C D E t',
    sommets: 's:0,1.2 A:1.4,0.6 B:2.8,0 C:4.2,0.6 D:1.4,1.8 E:2.8,1.8 t:5.6,1.2',
    aretes: 's>A:6 s>D:4 A>B:2 B>C:2 C>A:2 A>D:3 D>E:4 E>C:1 C>t:4 E>t:2 D>t:3~0.45',
    flot: 's>A:2 s>D:3 A>D:2 A>B:2 B>C:2 C>A:2 C>t:1 D>E:3 D>t:2 E>C:1 E>t:2'
  });

  ML.graphe('td4-res-panne', {
    titre: 'TD 4, exercice II.2 : flot sans (E, t)',
    oriente: true,
    ordre: 's A B C D E t',
    sommets: 's:0,1.2 A:1.4,0.6 B:2.8,0 C:4.2,0.6 D:1.4,1.8 E:2.8,1.8 t:5.6,1.2',
    aretes: 's>A:6 s>D:4 A>B:2 B>C:2 C>A:2 A>D:3 D>E:4 E>C:1 C>t:4 E>t:2 D>t:3~0.45',
    flot: 's>A:2 s>D:3 A>D:1 A>B:2 B>C:2 C>A:1 C>t:2 D>E:1 D>t:3 E>C:1 E>t:0'
  });

  ML.graphe('ff-ex', {
    titre: 'Réseau à 6 sommets, flot nul au départ',
    oriente: true,
    ordre: 's a b c d t',
    sommets: 's:0,1.1 a:1.6,0 b:1.6,2.2 c:3.4,0 d:3.4,2.2 t:5,1.1',
    aretes: 's>a:10 s>b:8 a>b:4 a>c:6 b>d:9 c>b:3 c>t:10 d>c:2 d>t:5',
    flot: ''
  });

  /* ---------------------------------------------------- Contrôles blancs */

  ML.graphe('cb1-dij', {
    titre: 'Contrôle blanc 1, exercice I',
    oriente: true,
    ordre: 'S A B C D E',
    sommets: 'S:0,1 A:1.5,0 B:1.5,2 C:3,0 D:3,2 E:4.5,1',
    aretes: 'S>A:7 S>B:2 B>A:3 A>C:4 B>D:8 B>C:9 C>D:1 C>E:6 D>E:2 E>A:5'
  });

  ML.grapheTaches('cb1-ordo', {
    titre: 'Contrôle blanc 1, exercice II',
    taches: 'A:2 B:4 C:3 D:5 E:4 F:2 G:3 H:1',
    avant: { C: 'A', D: 'A', E: 'B C', F: 'D', G: 'D E', H: 'F G' },
    sommets: 'deb:0,1.2 A:1.2,0.4 B:1.2,2 C:2.4,0.4 D:2.4,2 E:3.6,0.4 F:3.6,2 G:4.8,1.2 H:6,1.2 fin:7.2,1.2'
  });

  ML.graphe('cb1-flot', {
    titre: 'Contrôle blanc 1, exercice III',
    oriente: true,
    ordre: 's a b c d t',
    sommets: 's:0,1.1 a:1.6,0 b:1.6,2.2 c:3.4,0 d:3.4,2.2 t:5,1.1',
    aretes: 's>a:7 s>b:9 a>c:5 a>d:4 b>a:3 b>d:6 d>c:2 c>t:8 d>t:7',
    flot: 's>a:5 s>b:6 a>c:5 a>d:3 b>a:3 b>d:3 d>c:0 c>t:5 d>t:6'
  });

  ML.graphe('cb2-bk', {
    titre: 'Contrôle blanc 2, exercice I',
    oriente: true,
    sommets: '1:0,1 2:1.5,0 3:1.5,2 4:3,0 5:3,2 6:4.5,1',
    aretes: '1>2:4 1>3:2 3>2:-1 2>4:2 4>3:1 3>5:5 5>4:-3 4>6:3 5>6:-2'
  });

  ML.graphe('cb2-bk-sc', {
    titre: 'Contrôle blanc 2, exercice I (sans l\'arc (4, 3))',
    oriente: true,
    sommets: '1:0,1 2:1.5,0 3:1.5,2 4:3,0 5:3,2 6:4.5,1',
    aretes: '1>2:4 1>3:2 3>2:-1 2>4:2 3>5:5 5>4:-3 4>6:3 5>6:-2'
  });

  ML.graphe('cb2-flot', {
    titre: 'Contrôle blanc 2, exercice II',
    oriente: true,
    ordre: 's E1 E2 M1 M2 M3 t',
    sommets: 's:0,1.2 E1:1.6,0.4 E2:1.6,2 M1:3.4,0 M2:3.4,1.2 M3:3.4,2.4 t:5,1.2',
    aretes: 's>E1:14 s>E2:12 E1>E2:3 E1>M1:6 E1>M2:7 E2>M2:4 E2>M3:8 M1>t:8 M2>t:9 M3>t:7',
    flot: ''
  });
})(window.ML);
