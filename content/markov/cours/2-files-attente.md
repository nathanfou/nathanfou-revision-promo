---
matiere: Markov
chapitre: Files d'attente
source: Lilia
---
## 1. Généralités

- $\lambda$ : **taux moyen d'arrivée** des clients, en clients par unité de temps.
  Exemple : 64 clients arrivent en moyenne par jour, donc $\lambda = 64$ clients/jour.
- $\mu$ : **taux de service**, inverse de la **durée moyenne de service** : $\mu = 1/(\text{durée moyenne de service})$.
  Exemple : un dossier est traité en $2{,}5$ min en moyenne. La durée moyenne est $1/\mu = 2{,}5$ min/usager, donc $\mu = \dfrac{1}{2{,}5} = 0{,}4$ usager/min $= \dfrac{60}{2{,}5} = 24$ usagers/h.

:::piege Mêmes unités
$\lambda$ et $\mu$ doivent être exprimés dans la **même unité de temps** (par heure, par minute…) avant de calculer $\lambda/\mu$.
:::

:::def Distribution stationnaire en temps continu
Une file d'attente markovienne est une chaîne de Markov **en temps continu**, décrite par son générateur $Q$ (taux de transition), pas par une matrice de probabilités $P$. La distribution stationnaire vérifie
$$\pi Q = 0 \qquad \text{et} \qquad \sum_k \pi_k = 1$$
Pour une file (processus de naissance et de mort), cela revient aux équations de coupe : $\lambda_k\, \pi_k = \mu_{k+1}\, \pi_{k+1}$.
:::

## 2. File M/M/1

**Notation de Kendall** : arrivées selon un processus de Poisson (M), durées de service exponentielles (M), **1 serveur** (un seul guichet).

[[widget:chaine|n=mm1]]

:::prop Distribution stationnaire
La probabilité qu'il y ait $k$ clients **dans le système** (en service + en attente) est
$$\pi_k = (1-a)\,a^k \qquad \text{avec } a = \frac{\lambda}{\mu}$$
Elle existe si et seulement si $a < 1$, c'est-à-dire $\lambda < \mu$ (sinon la file grossit sans fin). La normalisation $\sum_k \pi_k = 1$ est alors automatiquement vérifiée.
:::

Exemple : la probabilité d'observer **4 usagers en attente** derrière celui en cours de service correspond à $5$ clients dans le système : $\pi_5 = (1-a)\,a^5$.

:::astuce Sens de a
$a = P(\text{serveur occupé}) = 1 - \pi_0 = 1 - P(\text{serveur libre})$.
Un client qui arrive attend exactement quand le serveur est occupé (les arrivées poissoniennes « voient » la loi stationnaire) : si la probabilité qu'un client attende vaut $0{,}5$, alors $a = 0{,}5$.
:::

### Indicateurs de performance

| Grandeur | Signification | Formule |
|---|---|---|
| $E[T]$ | temps moyen de **séjour** dans le système (attente + service) | $\dfrac{1}{\mu - \lambda}$ |
| $L$ | nombre moyen de clients **dans le système** | $\lambda\,E[T] = \dfrac{\lambda}{\mu - \lambda} = \dfrac{a}{1-a}$ |
| $E[T_q]$ | temps moyen passé **dans la file d'attente** (avant le service) | $\dfrac{\lambda}{\mu(\mu - \lambda)}$ |
| $L_q$ | nombre moyen de clients **dans la file d'attente** | $\lambda\,E[T_q] = \dfrac{\lambda^2}{\mu(\mu - \lambda)}$ |

:::prop Formule de Little et loi du temps de séjour
- $L = \lambda\,E[T]$ et $L_q = \lambda\,E[T_q]$.
- $E[T] = E[T_q] + \dfrac{1}{\mu}$ : le séjour, c'est l'attente plus le service.
- En M/M/1 (service dans l'ordre d'arrivée), le temps de séjour $T$ suit une **loi exponentielle** de paramètre $\mu - \lambda$, d'où $E[T] = \dfrac{1}{\mu - \lambda}$.
:::

[[widget:mm1|lambda=6;mu=10]]

### Arrivées : processus de Poisson

Le nombre $N(t)$ de clients qui **arrivent** pendant un intervalle de durée $t$ suit une loi de Poisson de paramètre $\lambda t$ :
$$P(N(t) = k) = e^{-\lambda t}\,\frac{(\lambda t)^k}{k!}$$

Exemple : la probabilité qu'entre 16 h et 17 h ($t = 1$ h, $\lambda$ en clients/h) arrivent exactement 2 clients est
$$P(N(1) = 2) = e^{-\lambda}\,\frac{\lambda^2}{2!} = \frac{\lambda^2}{2}\,e^{-\lambda}$$

:::piege Deux N différents
Ici $N(t)$ compte les **arrivées** pendant $t$ ; à ne pas confondre avec le nombre de clients **présents** dans le système, dont la loi est $\pi_k$.
:::

## 3. File M/M/∞

**Notation de Kendall** : arrivées poissoniennes, services exponentiels, **nombre illimité de serveurs** : chaque client est servi dès son arrivée, il n'y a jamais d'attente.

[[widget:chaine|n=mminf]]

:::prop Distribution stationnaire
Avec $k$ clients, $k$ services sont en cours ($\mu_k = k\mu$). La probabilité qu'il y ait $k$ clients dans le système suit une loi de Poisson de paramètre $\lambda/\mu$ :
$$\pi_k = e^{-\lambda/\mu}\,\frac{(\lambda/\mu)^k}{k!}$$
Elle existe **pour toutes** valeurs de $\lambda$ et $\mu$ : la condition $\lambda < \mu$ ne concerne pas la M/M/∞.
:::

- Nombre moyen de clients (tous en cours de service) : $E[N] = \dfrac{\lambda}{\mu}$.
- Temps moyen de séjour : $E[T] = \dfrac{1}{\mu}$ (pas d'attente), et Little donne bien $E[N] = \lambda \cdot \dfrac{1}{\mu}$.
