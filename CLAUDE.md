# BOTC — Grimoire du Conteur

- **Version** : chaque PR augmente `version` dans `package.json` (et `package-lock.json`, via `npm version <x.y.z> --no-git-tag-version`). Elle s'affiche en bas à droite de l'app avec l'heure du build, pour vérifier que l'iPad a bien pris la mise à jour. La CI échoue si la version n'a pas changé.
- Vocabulaire français : Villageois, Étranger, Sbire, Démon ; la Femme écarlate s'appelle **Succube**.
- Avant de pousser : `npm run lint`, `npm run typecheck`, `npm test` (et `npm run test:e2e` si l'interface change).
