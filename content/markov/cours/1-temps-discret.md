---
matiere: Markov
chapitre: Chaînes de Markov en temps discret
source: Lilia
---
## 1. Construire les états : l'exemple de l'équipe de travaux

:::exemple Énoncé (exercice CMTD)
Une équipe reçoit chaque semaine des demandes de travaux de deux types :
- **A** : travaux d'importance moyenne, ils durent **une semaine** ; une demande A arrive avec probabilité $p$ ;
- **B** : travaux de haute importance, ils durent **deux semaines** ; une demande B arrive avec probabilité $q$.

Il n'y a pas de liste d'attente. Si une demande B arrive, elle est prise en priorité ; pendant un travail B, les autres demandes (notamment A) sont refusées et comptent comme inexistantes.
:::

Un travail B dure deux semaines : pour que le futur ne dépende que du présent (propriété de Markov), on découpe « B » en deux états, 1re et 2e semaine.

| État | Situation | Probabilité d'y entrer depuis 0, 1 ou 3 |
|---|---|---|
| $0$ | équipe inactive : ni demande A, ni demande B | $(1-p)(1-q)$ |
| $1$ | travail A : demande A, pas de demande B | $p(1-q)$ |
| $2$ | travail B, 1re semaine : demande B (une demande A est refusée) | $q$ |
| $3$ | travail B, 2e semaine | aucune : on n'y arrive que depuis $2$ |

Sur le graphe, on note $\alpha = (1-p)(1-q)$ et $\beta = p(1-q)$.

[[widget:chaine|n=ascenseurs]]

**Lecture du graphe.**
- Depuis $0$, $1$ ou $3$ (l'équipe est libre la semaine suivante) : on va en $0$ si aucune demande n'arrive, $(1-p)(1-q)$ ; en $1$ si une demande A arrive sans demande B, $p(1-q)$ ; en $2$ si une demande B arrive, $q$.
- Depuis $2$ : on passe en $3$ avec probabilité $1$ (le travail B continue sa 2e semaine).

$$P = \begin{pmatrix} (1-p)(1-q) & p(1-q) & q & 0 \\ (1-p)(1-q) & p(1-q) & q & 0 \\ 0 & 0 & 0 & 1 \\ (1-p)(1-q) & p(1-q) & q & 0 \end{pmatrix}$$

:::piege Matrice stochastique
- Tous les coefficients sont **positifs ou nuls** : $P_{ij} \ge 0$.
- La somme de **chaque ligne** vaut $1$ (ce sont les lignes, pas les colonnes) : ici $(1-p)(1-q) + p(1-q) + q = (1-q) + q = 1$.
:::

## 2. Distribution stationnaire

:::def Définition
Une distribution $\pi = (\pi_0, \pi_1, \dots)$ est **stationnaire** si
$$\pi P = \pi \qquad \text{et} \qquad \sum_i \pi_i = 1,\ \pi_i \ge 0$$
La somme porte sur **tous** les états de la chaîne.
:::

:::prop Existence et unicité
- Une chaîne **finie et irréductible** (tous les états communiquent) a **une unique** distribution stationnaire.
- Si en plus elle est **apériodique**, $\pi(t)$ converge vers cette distribution quelle que soit la loi de départ.

Ici, avec $0 < p < 1$ et $0 < q < 1$, la chaîne est irréductible ($0 \to 2 \to 3 \to 1 \to 0$) et apériodique (boucle sur $0$) : la distribution stationnaire existe, est unique, et c'est la limite de $\pi(t)$.
:::

### Exemple : résolution pour l'équipe de travaux

On écrit $(\pi_0, \pi_1, \pi_2, \pi_3) = (\pi_0, \pi_1, \pi_2, \pi_3)\,P$, colonne par colonne :

$$\begin{aligned}
\pi_0 &= (1-p)(1-q)\,(\pi_0 + \pi_1 + \pi_3) \\
\pi_1 &= p(1-q)\,(\pi_0 + \pi_1 + \pi_3) \\
\pi_2 &= q\,(\pi_0 + \pi_1 + \pi_3) \\
\pi_3 &= \pi_2
\end{aligned}$$

Avec la normalisation $\pi_0 + \pi_1 + \pi_2 + \pi_3 = 1$, on a $\pi_0 + \pi_1 + \pi_3 = 1 - \pi_2$, donc :

$$\pi_2 = q(1 - \pi_2) \iff (1+q)\,\pi_2 = q \iff \pi_2 = \frac{q}{1+q}, \qquad 1 - \pi_2 = \frac{1}{1+q}$$

:::methode Résultat
$$\pi_0 = \frac{(1-p)(1-q)}{1+q}, \qquad \pi_1 = \frac{p(1-q)}{1+q}, \qquad \pi_2 = \pi_3 = \frac{q}{1+q}$$

**Vérification** : $\pi_0 + \pi_1 + \pi_2 + \pi_3 = \dfrac{(1-q) + 2q}{1+q} = \dfrac{1+q}{1+q} = 1$.
:::

[[widget:markov|modele=ascenseurs]]
