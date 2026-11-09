/**
 * The training catalogue's text in Spanish, French and Portuguese.
 *
 * The server sends the catalogue in English; these are the translations the
 * screens and the home search show. Kept here, outside the screens, so the
 * home page and the search can use them without loading those screens.
 */

export const SCENARIO_ES: Record<string, { title: string; role: string; brief: string; goal: string }> = {
  "group-project": {
    title: "Trabajo grupal desbalanceado",
    role: "Un compañero de clase que no entregó dos avances",
    brief: "La exposición es la próxima semana. Acuerda una división justa y específica sin terminar haciendo todo por tu cuenta.",
    goal: "Nombra hechos observables, pregunta qué bloquea el avance y acuerda responsables con una fecha de revisión.",
  },
  "grade-review": {
    title: "Pedir explicación de una calificación",
    role: "Un docente con poco tiempo de atención",
    brief: "Tu proyecto recibió menos puntaje del que esperabas. Tienes la rúbrica, pero no entiendes cómo se evaluó un criterio.",
    goal: "Pide evidencia concreta y cómo mejorar sin exigir una nota más alta.",
  },
  "research-uncertainty": {
    title: "Resultados que no respaldan tu hipótesis",
    role: "Un asesor de investigación que esperaba un resultado contundente",
    brief: "Tu estudio muestra resultados mixtos. Conversa con honestidad sobre las limitaciones y el siguiente paso metodológico.",
    goal: "Separa la evidencia de la interpretación y evita exagerar la certeza.",
  },
  "advisor-scope": {
    title: "Negociar el alcance de la tesis con tu asesor",
    role: "Un asesor que sugiere agregar un capítulo empírico cerca de la entrega",
    brief: "Tu fecha límite es en seis semanas. Tu asesor propone un experimento adicional que retrasaría tu sustentación.",
    goal: "Reconoce el valor académico, haz explícita la restricción de tiempo y propón llevar esa extensión a trabajo futuro.",
  },
  "oral-exam-question": {
    title: "Aclarar una pregunta ambigua en examen oral",
    role: "Un jurado que plantea una pregunta teórica amplia bajo presión de tiempo",
    brief: "Durante una defensa o seminario, un miembro del jurado hace una pregunta que puede responderse desde dos marcos distintos.",
    goal: "Explica brevemente tu interpretación, confirma el enfoque con el jurado y responde con estructura.",
  },
  "founder-no": {
    title: "Decirle que no a un founder",
    role: "Un founder que pide comprometer una fecha de lanzamiento",
    brief: "El founder quiere anunciar una funcionalidad grande este viernes, pero la versión actual todavía tiene riesgos de estabilidad.",
    goal: "Pon un límite claro, explica las consecuencias y ofrece una alternativa más pequeña y reversible.",
  },
  "engineering-scope": {
    title: "Negociar alcance con ingeniería y producto",
    role: "Un líder de producto que prometió un lanzamiento amplio",
    brief: "Dos desarrolladores tienen un sprint. El alcance pedido incluye una migración y tres funciones visibles para usuarios.",
    goal: "Aclara prioridades, visibiliza dependencias y acuerda qué queda fuera de esta entrega.",
  },
  "designer-feedback": {
    title: "Dar feedback difícil a un diseñador senior",
    role: "Un diseñador senior muy comprometido con su propuesta",
    brief: "En las pruebas de usabilidad las personas no encontraron la acción principal. Conversa sobre el diseño sin atacar a quien lo creó.",
    goal: "Usa observaciones concretas, invita a interpretar la señal y propón una iteración verificable.",
  },
  "stakeholder": {
    title: "Explicar un retraso técnico a un stakeholder",
    role: "Un stakeholder no técnico con un compromiso frente a clientes",
    brief: "Una integración externa está fallando. Explica el impacto en el negocio y las opciones sin jerga ni falsas promesas.",
    goal: "Traduce el riesgo técnico a consecuencias claras, verifica entendimiento y acuerda una decisión.",
  },
  "incomplete-data": {
    title: "Decidir con datos incompletos",
    role: "Una gerencia que pide una recomendación cerrada hoy",
    brief: "Los primeros datos de conversión parecen positivos, pero la muestra es pequeña y los tickets de soporte están subiendo.",
    goal: "Declara la incertidumbre, separa hipótesis de hechos y define un umbral claro para decidir.",
  },
  "family-money": {
    title: "Hablar de dinero con la familia",
    role: "Un familiar cercano que pide apoyo económico recurrente",
    brief: "Te importa tu familiar, pero no puedes sostener el monto que te pide. Practica cómo poner un límite sin hacer promesas que no puedas cumplir.",
    goal: "Cuida el vínculo, expresa tu límite con claridad y conversa sobre alternativas realistas.",
  },
  "in-laws": {
    title: "Poner límites con los suegros",
    role: "Un familiar político que espera pasar todas las fiestas juntos",
    brief: "Tú y tu pareja quieren organizar las fechas de fin de año de otra manera. Conversa sobre las expectativas sin culpar a tu pareja.",
    goal: "Plantea un límite compartido, escucha su postura y propón un acuerdo concreto.",
  },
  "inheritance": {
    title: "Desacuerdo por una herencia familiar",
    role: "Un hermano que quiere decidir rápido sobre un bien familiar",
    brief: "Necesitas revisar documentos y tiempo antes de aceptar. Practica la conversación enfocándote en la comunicación, no en asesoría legal.",
    goal: "Separa la carga emocional de los datos pendientes y sugiere un proceso profesional neutral.",
  },
  "conflict-avoidance": {
    title: "Abordar un conflicto que vienes evitando",
    role: "Una persona cercana que cree que el tema ya estaba resuelto",
    brief: "Has evitado hablar sobre una responsabilidad compartida que se volvió desigual. Abre la conversación con calma y haz un pedido concreto.",
    goal: "Describe el patrón sin adivinar intenciones, escucha su punto de vista y acuerda un primer paso pequeño.",
  },
};

export const SCENARIO_FR: Record<string, { title: string; role: string; brief: string; goal: string }> = {
  "group-project": {
    title: "Projet de groupe déséquilibré",
    role: "Un camarade de classe qui a manqué deux étapes",
    brief: "La présentation a lieu la semaine prochaine. Convenez d'une répartition juste et précise sans finir par tout faire vous-même.",
    goal: "Nommez des faits observables, demandez ce qui bloque l'avancement et fixez des responsables avec une date de suivi.",
  },
  "grade-review": {
    title: "Demander des explications sur une note",
    role: "Un enseignant pressé pendant sa permanence",
    brief: "Votre projet a reçu une note inférieure à vos attentes. Vous avez la grille d'évaluation, mais un critère reste flou.",
    goal: "Demandez des éléments concrets et des pistes d'amélioration sans exiger un changement de note.",
  },
  "research-uncertainty": {
    title: "Résultats ne confirmant pas votre hypothèse",
    role: "Un directeur de recherche qui attendait un résultat net",
    brief: "Votre étude montre des résultats mitigés. Discutez honnêtement des limites et de la prochaine étape méthodologique.",
    goal: "Séparez les preuves de l'interprétation et évitez de surévaluer la certitude.",
  },
  "advisor-scope": {
    title: "Négocier le périmètre de la thèse avec votre directeur",
    role: "Un directeur de thèse proposant d'ajouter un chapitre empirique près de la remise",
    brief: "Votre échéance est dans six semaines. Votre directeur suggère une expérience supplémentaire qui retarderait votre soutenance.",
    goal: "Reconnaissez la valeur académique, explicitez la contrainte de temps et proposez de placer cette piste en travaux futurs.",
  },
  "oral-exam-question": {
    title: "Clarifier une question ambiguë lors d'un oral",
    role: "Un membre du jury posant une question théorique large sous contrainte de temps",
    brief: "Pendant une soutenance ou un séminaire, un examinateur pose une question pouvant être abordée sous deux angles différents.",
    goal: "Exposez brièvement votre interprétation, validez l'angle avec le jury et répondez de façon structurée.",
  },
  "founder-no": {
    title: "Dire non à un fondateur",
    role: "Un fondateur qui demande un engagement de lancement",
    brief: "Le fondateur veut annoncer une fonctionnalité majeure ce vendredi, mais la version actuelle présente encore des risques de stabilité.",
    goal: "Posez une limite claire, expliquez les conséquences et proposez une alternative plus ciblée et réversible.",
  },
  "engineering-scope": {
    title: "Négocier le périmètre avec l'ingénierie et le produit",
    role: "Un responsable produit ayant promis un lancement large",
    brief: "Deux développeurs ont un sprint. Le périmètre demandé inclut une migration et trois fonctionnalités visibles par les utilisateurs.",
    goal: "Clarifiez les priorités, rendez visibles les dépendances et convenez de ce qui sort de cette livraison.",
  },
  "designer-feedback": {
    title: "Donner un retour difficile à un designer senior",
    role: "Un designer senior très attaché à sa proposition",
    brief: "Lors des tests d'utilisabilité, les participants n'ont pas trouvé l'action principale. Discutez du design sans attaquer la personne.",
    goal: "Appuyez-vous sur des observations concrètes, invitez à interpréter le signal et proposez une itération vérifiable.",
  },
  "stakeholder": {
    title: "Expliquer un retard technique à une partie prenante",
    role: "Un interlocuteur non technique ayant pris un engagement client",
    brief: "Une intégration externe échoue. Expliquez l'impact métier et les options sans jargon ni fausses promesses.",
    goal: "Traduisez le risque technique en conséquences claires, vérifiez la compréhension et convenez d'une décision.",
  },
  "incomplete-data": {
    title: "Décider avec des données incomplètes",
    role: "Une direction qui demande une recommandation tranchée aujourd'hui",
    brief: "Les premières conversions semblent positives, mais l'échantillon est faible et les tickets de support augmentent.",
    goal: "Annoncez l'incertitude, séparez les hypothèses des faits et définissez un seuil clair de décision.",
  },
  "family-money": {
    title: "Parler d'argent avec sa famille",
    role: "Un proche qui demande un soutien financier récurrent",
    brief: "Vous tenez à ce proche, mais vous ne pouvez pas assumer le montant demandé. Exercez-vous à poser une limite claire sans fausses promesses.",
    goal: "Préservez la relation, exprimez votre limite avec clarté et discutez d'alternatives réalistes.",
  },
  "in-laws": {
    title: "Poser des limites avec sa belle-famille",
    role: "Un beau-parent qui s'attend à passer toutes les fêtes ensemble",
    brief: "Votre partenaire et vous souhaitez organiser les fêtes autrement cette année. Parlez des attentes sans rejeter la faute sur votre partenaire.",
    goal: "Présentez une limite partagée, écoutez leur point de vue et proposez un accord concret.",
  },
  "inheritance": {
    title: "Désaccord autour d'un héritage familial",
    role: "Un frère ou une sœur qui veut décider vite au sujet d'un bien familial",
    brief: "Vous avez besoin de vérifier des documents et de prendre du temps avant d'accepter. Concentrez la conversation sur la communication.",
    goal: "Séparez la charge émotionnelle des éléments factuels en attente et proposez un cadre professionnel neutre.",
  },
  "conflict-avoidance": {
    title: "Aborder un conflit que vous évitiez",
    role: "Un proche qui pense que le sujet était déjà réglé",
    brief: "Vous avez évité de parler d'une responsabilité partagée devenue déséquilibrée. Ouvrez la discussion calmement avec une demande précise.",
    goal: "Décrivez la situation sans prêter d'intentions, écoutez son point de vue et convenez d'une première étape concrète.",
  },
};

export const SCENARIO_PT: Record<string, { title: string; role: string; brief: string; goal: string }> = {
  "group-project": {
    title: "Trabalho em grupo desequilibrado",
    role: "Um colega de turma que perdeu duas entregas",
    brief: "A apresentação é na próxima semana. Combine uma divisão justa e específica sem acabar fazendo tudo sozinho.",
    goal: "Cite fatos observáveis, pergunte o que está travando o avanço e defina responsáveis com data de revisão.",
  },
  "grade-review": {
    title: "Pedir explicação sobre uma nota",
    role: "Um professor com pouco tempo de atendimento",
    brief: "Seu projeto recebeu uma nota menor do que o esperado. Você tem a rubrica, mas não entendeu como um critério foi avaliado.",
    goal: "Peça evidências concretas e orientações de melhoria sem exigir aumento de nota.",
  },
  "research-uncertainty": {
    title: "Resultados que não sustentam sua hipótese",
    role: "Um orientador que esperava um resultado conclusivo",
    brief: "Seu estudo mostra resultados mistos. Converse com honestidade sobre as limitações e o próximo passo metodológico.",
    goal: "Separe a evidência da interpretação e evite exagerar a certeza.",
  },
  "advisor-scope": {
    title: "Negociar o escopo da tese com seu orientador",
    role: "Um orientador que sugere adicionar um capítulo empírico perto da entrega",
    brief: "Seu prazo final é em seis semanas. Seu orientador propõe um experimento extra que atrasaria sua defesa.",
    goal: "Reconheça o valor acadêmico, explicite a restrição de tempo e proponha levar essa extensão para trabalhos futuros.",
  },
  "oral-exam-question": {
    title: "Esclarecer uma pergunta ambígua em exame oral",
    role: "Um membro da banca que faz uma pergunta teórica ampla sob pressão de tempo",
    brief: "Durante uma defesa ou seminário, um avaliador faz uma pergunta que pode ser respondida por dois referenciais distintos.",
    goal: "Explique brevemente sua interpretação, confirme o recorte com a banca e responda com estrutura.",
  },
  "founder-no": {
    title: "Dizer não a um fundador",
    role: "Um fundador pedindo compromisso de lançamento",
    brief: "O fundador quer anunciar uma grande funcionalidade nesta sexta-feira, mas a versão atual ainda apresenta riscos de estabilidade.",
    goal: "Defina um limite claro, explique as consequências e ofereça uma alternativa menor e reversível.",
  },
  "engineering-scope": {
    title: "Negociar escopo com engenharia e produto",
    role: "Um líder de produto que prometeu um lançamento amplo",
    brief: "Dois desenvolvedores têm uma sprint. O escopo pedido inclui uma migração e três funcionalidades visíveis para usuários.",
    goal: "Esclareça prioridades, torne as dependências visíveis e combine o que fica fora desta entrega.",
  },
  "designer-feedback": {
    title: "Dar feedback difícil a um designer sênior",
    role: "Um designer sênior muito apegado à própria proposta",
    brief: "Nos testes de usabilidade as pessoas não encontraram a ação principal. Converse sobre o design sem atacar quem o criou.",
    goal: "Use observações concretas, convide a interpretar o sinal e proponha uma iteração verificável.",
  },
  "stakeholder": {
    title: "Explicar um atraso técnico a um stakeholder",
    role: "Um stakeholder não técnico com compromisso assumido com clientes",
    brief: "Uma integração externa está falhando. Explique o impacto no negócio e as opções sem jargão nem falsas promessas.",
    goal: "Traduza o risco técnico em consequências claras, confirme o entendimento e alinhe uma decisão.",
  },
  "incomplete-data": {
    title: "Decidir com dados incompletos",
    role: "Uma liderança que pede uma recomendação fechada hoje",
    brief: "Os primeiros dados de conversão parecem positivos, mas a amostra é pequena e os chamados de suporte estão subindo.",
    goal: "Declare a incerteza, separe hipóteses de fatos e defina um critério claro para decidir.",
  },
  "family-money": {
    title: "Conversar sobre dinheiro com a família",
    role: "Um familiar próximo pedindo ajuda financeira recorrente",
    brief: "Você se importa com esse familiar, mas não pode sustentar o valor pedido. Pratique como colocar um limite sem promessas irreais.",
    goal: "Cuide do vínculo, expresse seu limite com clareza e converse sobre alternativas realistas.",
  },
  "in-laws": {
    title: "Definir limites com os sogros",
    role: "Um familiar político que espera passar todas as festas junto",
    brief: "Você e sua parceria querem organizar as festas de fim de ano de outra forma. Converse sobre expectativas sem culpar sua parceria.",
    goal: "Apresente um limite compartilhado, ouça o outro lado e proponha um combinado concreto.",
  },
  "inheritance": {
    title: "Desacordo sobre herança familiar",
    role: "Um irmão que quer decidir rápido sobre um bem da família",
    brief: "Você precisa revisar documentos e ter tempo antes de aceitar. Pratique a conversa focando na comunicação, não em consultoria jurídica.",
    goal: "Separe a carga emocional das informações pendentes e sugira um processo profissional neutro.",
  },
  "conflict-avoidance": {
    title: "Abordar um conflito que você vem evitando",
    role: "Uma pessoa próxima que acredita que o assunto já estava resolvido",
    brief: "Você evitou falar sobre uma responsabilidade compartilhada que ficou desigual. Abra a conversa com calma e faça um pedido concreto.",
    goal: "Descreva o padrão sem supor intenções, ouça o ponto de vista da pessoa e combine um primeiro passo pequeno.",
  },
};

export const CASE_ES: Record<string, { title: string; prompt: string; options: [string, string, string] }> = {
  "case-a": {
    title: "Actividad automatizada inesperada tras un despliegue",
    prompt: "Un sistema automatizado de transacciones acaba de recibir una actualización de software. Aparecen alertas antes de la apertura y comienza una actividad inesperada. ¿Qué priorizas primero?",
    options: [
      "Contener la actividad de inmediato y verificar la consistencia de las versiones desplegadas",
      "Esperar unos minutos para observar si el volumen se estabiliza solo",
      "Aumentar la capacidad de procesamiento para vaciar la cola más rápido",
    ],
  },
  "case-b": {
    title: "Recuperación tras una interrupción de red",
    prompt: "Un servicio sufrió una breve caída de red y los estados de las bases de datos divergieron. Puedes restaurar la disponibilidad rápido aceptando posibles inconsistencias o pausar escrituras mientras reconcilias los datos. ¿Qué enfoque eliges?",
    options: [
      "Reanudar todas las escrituras de inmediato",
      "Priorizar la integridad de los datos y comunicar una recuperación más gradual",
      "Asumir que la reconexión automática reparó la divergencia",
    ],
  },
  "case-c": {
    title: "Desfase entre dos equipos en una interfaz crítica",
    prompt: "Dos equipos intercambian datos numéricos para guiar un vehículo remoto. La trayectoria observada difiere de la predicción. ¿Qué hipótesis pruebas primero en la interfaz?",
    options: [
      "Las mediciones deben ser ruido aleatorio",
      "El vehículo tiene una falla mecánica interna",
      "Quien produce el dato y quien lo consume están interpretando las unidades de forma distinta",
    ],
  },
  "case-d": {
    title: "Fricción en el registro antes de pagar",
    prompt: "Muchos compradores abandonan el carrito justo después de pulsar el botón de pago, donde se les pide registrarse o iniciar sesión antes de completar la compra. ¿Qué hipótesis de producto pruebas primero?",
    options: [
      "Reemplazar el registro obligatorio previo al pago por compra como invitado y creación opcional de cuenta al finalizar",
      "Agregar más indicaciones de validación de contraseña en el formulario de registro",
      "Enviar un correo con descuento 24 horas después del abandono",
    ],
  },
  "case-e": {
    title: "Exceso de funciones frente al flujo con tracción real",
    prompt: "Tu aplicación móvil incluye insignias de juego, planes grupales y publicación de fotos, pero la retención está estancada y solo una función — compartir fotos con filtros — muestra tracción orgánica clara. ¿Cómo asignas el siguiente ciclo de producto?",
    options: [
      "Construir más recompensas sociales para levantar las funciones rezagadas",
      "Reenfocar el producto en el único flujo de fotos con señal fuerte y recortar el resto",
      "Mantener todas las funciones y rediseñar la barra de navegación",
    ],
  },
  "case-f": {
    title: "Alto tráfico y pocas reservas en un marketplace",
    prompt: "Los anuncios de alojamiento en una ciudad principal reciben visitas, pero las reservas siguen bajas. Al revisar las publicaciones, las fotos son oscuras y tomadas con teléfonos de baja resolución. ¿Qué priorizas esta semana?",
    options: [
      "Reescribir el algoritmo de ordenamiento de búsqueda",
      "Probar fotografía de alta calidad en una muestra de anuncios para verificar si la confianza visual es el cuello de botella",
      "Reducir la comisión de la plataforma en 2%",
    ],
  },
};

export const CASE_FR: Record<string, { title: string; prompt: string; options: [string, string, string] }> = {
  "case-a": {
    title: "Activité automatisée inattendue après un déploiement",
    prompt: "Un système automatisé de transactions vient de recevoir une mise à jour logicielle. Des alertes apparaissent avant l'ouverture et une activité inattendue commence. Que priorisez-vous en premier ?",
    options: [
      "Contenir immédiatement l'activité et vérifier la cohérence des versions déployées",
      "Attendre quelques minutes pour voir si le volume se stabilise seul",
      "Augmenter la capacité de traitement pour vider la file plus vite",
    ],
  },
  "case-b": {
    title: "Reprise après une coupure réseau",
    prompt: "Un service a subi une brève coupure réseau et les états des bases de données ont divergé. Vous pouvez restaurer la disponibilité rapidement en acceptant d'éventuelles incohérences ou suspendre les écritures pendant la réconciliation. Quelle approche choisissez-vous ?",
    options: [
      "Reprendre immédiatement toutes les écritures",
      "Prioriser l'intégrité des données et communiquer une reprise plus graduelle",
      "Supposer que la reconnexion automatique a réparé la divergence",
    ],
  },
  "case-c": {
    title: "Décalage entre deux équipes sur une interface critique",
    prompt: "Deux équipes échangent des données numériques pour guider un véhicule à distance. La trajectoire observée diffère de la prédiction. Quelle hypothèse testez-vous d'abord sur l'interface ?",
    options: [
      "Les mesures doivent être du bruit aléatoire",
      "Le véhicule a une défaillance mécanique interne",
      "Le producteur et le consommateur de la donnée interprètent les unités différemment",
    ],
  },
  "case-d": {
    title: "Friction d'inscription avant le paiement",
    prompt: "De nombreux acheteurs abandonnent leur panier juste après avoir cliqué sur le bouton de paiement, où on leur demande de s'inscrire ou de se connecter avant de finaliser l'achat. Quelle hypothèse produit testez-vous en premier ?",
    options: [
      "Remplacer l'inscription obligatoire avant paiement par un achat invité et une création de compte optionnelle après paiement",
      "Ajouter davantage d'indications de validation du mot de passe sur le formulaire",
      "Envoyer un e-mail de réduction 24 heures après l'abandon",
    ],
  },
  "case-e": {
    title: "Trop de fonctionnalités face au seul flux à forte traction",
    prompt: "Votre application mobile inclut des badges ludiques, des projets de groupe et le partage de photos, mais la rétention stagne et seule une fonctionnalité — le partage de photos avec filtres — montre une traction organique nette. Comment allouez-vous le prochain cycle produit ?",
    options: [
      "Construire davantage de récompenses sociales pour relancer les fonctionnalités en retard",
      "Recentrer le produit sur l'unique flux photo à fort signal et retirer le reste",
      "Conserver toutes les fonctionnalités et refondre la barre de navigation",
    ],
  },
  "case-f": {
    title: "Fort trafic et peu de réservations sur une place de marché",
    prompt: "Les annonces d'hébergement dans une grande ville reçoivent des visites, mais les réservations restent faibles. En examinant les annonces, les photos sont sombres et prises avec des téléphones basse résolution. Que priorisez-vous cette semaine ?",
    options: [
      "Réécrire l'algorithme de classement de recherche",
      "Tester des photos haute qualité sur un échantillon d'annonces pour vérifier si la confiance visuelle est le goulot d'étranglement",
      "Réduire la commission de la plateforme de 2 %",
    ],
  },
};

export const CASE_PT: Record<string, { title: string; prompt: string; options: [string, string, string] }> = {
  "case-a": {
    title: "Atividade automatizada inesperada após um deploy",
    prompt: "Um sistema automatizado de transações acabou de receber uma atualização de software. Alertas aparecem antes da abertura e começa uma atividade inesperada. O que você prioriza primeiro?",
    options: [
      "Conter a atividade imediatamente e verificar a consistência das versões implantadas",
      "Aguardar alguns minutos para observar se o volume se estabiliza sozinho",
      "Aumentar a capacidade de processamento para esvaziar a fila mais rápido",
    ],
  },
  "case-b": {
    title: "Recuperação após uma interrupção de rede",
    prompt: "Um serviço sofreu uma breve queda de rede e os estados dos bancos de dados divergiram. Você pode restaurar a disponibilidade rápido aceitando possíveis inconsistências ou pausar escritas enquanto reconcilia os dados. Qual abordagem escolhe?",
    options: [
      "Retomar todas as escritas imediatamente",
      "Priorizar a integridade dos dados e comunicar uma recuperação mais gradual",
      "Assumir que a reconexão automática reparou a divergência",
    ],
  },
  "case-c": {
    title: "Desalinhamento entre duas equipes em uma interface crítica",
    prompt: "Duas equipes trocam dados numéricos para guiar um veículo remoto. A trajetória observada difere da previsão. Qual hipótese você testa primeiro na interface?",
    options: [
      "As medições devem ser ruído aleatório",
      "O veículo tem uma falha mecânica interna",
      "Quem produz o dado e quem o consome estão interpretando as unidades de forma diferente",
    ],
  },
  "case-d": {
    title: "Fricção no cadastro antes do pagamento",
    prompt: "Muitos compradores abandonam o carrinho logo após clicar no botão de pagamento, onde são solicitados a criar conta ou entrar antes de concluir a compra. Qual hipótese de produto você testa primeiro?",
    options: [
      "Substituir o cadastro obrigatório antes do pagamento por compra como convidado e criação opcional de conta ao finalizar",
      "Adicionar mais dicas de validação de senha no formulário de cadastro",
      "Enviar um e-mail com desconto 24 horas após o abandono",
    ],
  },
  "case-e": {
    title: "Excesso de funcionalidades diante do fluxo com tração real",
    prompt: "Seu aplicativo móvel inclui medalhas de jogo, planos em grupo e publicação de fotos, mas a retenção está estagnada e apenas uma função — compartilhar fotos com filtros — mostra tração orgânica clara. Como você aloca o próximo ciclo de produto?",
    options: [
      "Construir mais recompensas sociais para levantar as funções atrasadas",
      "Refocar o produto no único fluxo de fotos com sinal forte e cortar o restante",
      "Manter todas as funções e redesenhar a barra de navegação",
    ],
  },
  "case-f": {
    title: "Alto tráfego e poucas reservas em um marketplace",
    prompt: "Os anúncios de hospedagem em uma cidade principal recebem visitas, mas as reservas continuam baixas. Ao revisar as publicações, as fotos são escuras e tiradas com celulares de baixa resolução. O que você prioriza nesta semana?",
    options: [
      "Reescrever o algoritmo de ordenação da busca",
      "Testar fotografia de alta qualidade em uma amostra de anúncios para verificar se a confiança visual é o gargalo",
      "Reduzir a comissão da plataforma em 2%",
    ],
  },
};
