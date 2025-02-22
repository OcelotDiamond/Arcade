const cardContainer = document.querySelector('.card-container');
const noResults = document.querySelector('.no-results');
const searchBar = document.querySelector('input');

const tagColorMap = {
    platformer: 'blue',
    infinite: 'purple',
    puzzle: 'orange',
    indev: 'red',
    '2d': 'yellow',
}

const gameData = [
    {
        name: 'BASALT',
        description: 'Take a low-poly plunge into the depths of an old mining tunnel. The deeper you go, the greater the reward, but can you take the heat?',
        tags: [
            'Platformer',
            'Infinite',
            '2D'
        ],
        achievements: {
            'depth': {
                name: 'Deepest Depths',
                type: 'generated_tiers',
                tiers: [100, 250, 500, 1000],
                fallback: 0, 
                description: 'Travel $s meters down'
            },
            'bombs': {
                name: 'Bombardier',
                type: 'generated_tiers',
                tiers: [10, 20, 30, 50],
                fallback: 0, 
                description: 'Detonate $s bombs'
            },
            'gems': {
                name: 'Gem Collector',
                type: 'generated_tiers',
                tiers: [10, 25, 50, 100],
                fallback: 0, 
                description: 'Uncover $s gems'
            },
            'rocks': {
                name: 'Quarryman',
                type: 'generated_tiers',
                tiers: [100, 250, 500, 1000],
                fallback: 0, 
                description: 'Shatter $s rocks'
            },
            'points': {
                name: 'Perfectionist',
                type: 'generated_tiers',
                tiers: [10000, 25000, 50000, 100000],
                fallback: 0, 
                description: 'Get $s points'
            }
        },
        thumbnail: 'BASALT/thumbnail.png',
        reference: 'BASALT/basalt.html'
    }, {
        name: 'Prism',
        description: 'Under Construction',
        tags: [
            'Puzzle',
            '2D',
            'Indev'
        ]
    }
];

function getIndexFromGameName(game) {
    for (let i = 0; i < gameData.length; i++) {
        if (gameData[i].name === game) {
            return i;
        }
    }
    return -1;
}

function getCardText(text) {
    if (testText(text, 14, 168, 6) <= 3) {
        return text;
    }
    
    const segments = text.split(' ');
    let totalString = '';
    
    for (let i = 0; i < segments.length; i++) {
        if (testText(`${totalString} ${segments[i]} ...`, 14, 168, 6) > 3) {
            return totalString + ' ...';
        }
        
        totalString += ' ' + segments[i];
    }
    
    return text;
}

function testText(text, fontSize, width, lineHeight) {
    const testingDiv = document.querySelector('.height-tester');
    testingDiv.style.width = `${width}px`;
    testingDiv.style.lineHeight = `${lineHeight}px`;
    testingDiv.style.fontSize = `${fontSize}px`;
    testingDiv.innerHTML = text;
    
    return Math.round(testingDiv.offsetHeight / parseInt(testingDiv.style.lineHeight));
}

function addCommas(numericString) {
    return numericString.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function onCardClicked(index) {
    setupOverlay(index);
}

function setupOverlay(gameIndex) {
    const game = gameData[gameIndex];
    
    const overlayElement = document.querySelector('.overlay');
    
    const titleElement = document.querySelector('.overlay-title');
    const descriptionElement = document.querySelector('.overlay-description');
    const tagsElement = document.querySelector('.overlay-tags');
    
    titleElement.innerHTML = game.name;
    descriptionElement.innerHTML = game.description;
    
    tagsElement.innerHTML = '';
    
    for (let i = 0; i < game.tags.length; i++) {
        const tag = document.createElement('span');
        tag.classList.add('tag');
        tag.classList.add(tagColorMap[game.tags[i].toLowerCase()]);
        tag.innerHTML = game.tags[i];
        tag.onclick = () => {
            onTagClicked(game.tags[i])
            
            overlayElement.classList.add('disabled');
            document.body.classList.remove('disabled');
        };
        tagsElement.appendChild(tag);
        
        tagsElement.appendChild(document.createElement('br'));
    }
    
    const galleryArrows = document.querySelector('.arrow-container');
    
    if (!game.gallery) {
        galleryArrows.style.visibility = 'hidden';
        galleryArrows.style.pointerEvents = 'none';
    } else {
        galleryArrows.style.visibility = 'visible';
        galleryArrows.style.pointerEvents = 'auto';
        //TODO: Impliment overlay galleries
    }
    
    const playButton = document.querySelector('.play-button');
    
    if (game.reference) {
        playButton.style.visibility = 'visible';
        playButton.style.pointerEvents = 'auto';
        
        titleElement.href = game.reference;
        playButton.href = game.reference;
    } else {
        playButton.style.visibility = 'hidden';
        playButton.style.pointerEvents = 'none';
        
        titleElement.href = '';
        playButton.href = '';
        
        playButton.onclick = () => {};
    }
    
    const imageElement = document.querySelector('.overlay-card > .image');
    
    imageElement.style.backgroundImage = `url(${game.thumbnail ?? 'placeholder.png'})`;
    
    const overlayCard = document.querySelector('.overlay-card');
    
    overlayCard.onclick = e => e.stopPropagation();
    
    const achievements = document.querySelector('.achievements');

    achievements.innerHTML = '';
    achievements.scrollTop = 0;

    if (game.achievements) {
        generateAchievementsOverlay(game);
    }

    generatePlaytimeData(game, true, true);
    
    overlayElement.onclick = () => {
        overlayElement.classList.add('disabled');
        document.body.classList.remove('disabled');
    };
    
    overlayElement.classList.remove('disabled');
    document.body.classList.add('disabled');
}

function generateAchievementsOverlay(game) {
    const achievements = Object.keys(game.achievements);
    const achievementsElement = document.querySelector('.achievements');
    
    achievements.sort((a, b) => {
        const achA = game.achievements[a].scoreData;
        const achB = game.achievements[b].scoreData;
    
        if (achA.color < achB.color) {
            return 1;
        } else if (achA.color > achB.color) {
            return -1;
        } else if (achA.data < achB.data) {
            return 1;
        } else if (achA.data > achB.data) {
            return -1;
        } else {
            return 0;
        }
    });
    
    achievementsElement.innerHTML = '';

    for (let i = 0; i < achievements.length; i++) {
        const current = game.achievements[achievements[i]];
        const scoreData = current.scoreData;
        
        const achievement = document.createElement('div');
        achievement.classList.add('achievement');
        achievement.onclick = e => {
            e.stopPropagation();
        };
        achievement.classList.add(`tier-${scoreData.color}`);
        
        const content = document.createElement('div');
        content.classList.add('achievement-content');
        achievement.appendChild(content);
        
        const title = document.createElement('div');
        title.classList.add('title');
        title.innerHTML = current.name;
        content.appendChild(title);
        
        const description = document.createElement('div');
        description.classList.add('description');
        description.innerHTML = current.description.replace('$s', scoreData.replace);
        content.appendChild(description);
        
        const progress = document.createElement('div');
        progress.classList.add('progress');
        progress.setAttribute('text-content', Math.floor(scoreData.data) + '%');
        progress.style.setProperty('--percentage', scoreData.data + '%');
        content.appendChild(progress);

        achievementsElement.appendChild(achievement);
    }
}

function generatePlaytimeData(game, doFirstUpdate, forceHTMLUpdate) {
    const firstPlayedElement = document.querySelector('.first-played');
    const playtimeElement = document.querySelector('.playtime');

    let htmlUpdates = forceHTMLUpdate;

    if (document.body.classList.contains('disabled')) {
        const gameName = document.querySelector('.overlay-title').innerHTML;

        if (game.name === gameName) {
            htmlUpdates = true;
        }
    }

    let playtime = localStorage.getItem(game.name + '.data.time_played');
    let first = localStorage.getItem(game.name + '.data.first_played');
    
    if (playtime) {
        playtime = parseInt(playtime);

        if (htmlUpdates) {
            const seconds = playtime / 1000;
            const minutes = seconds / 60;
            const hours = minutes / 60;
            
            if (seconds < 100) {
                playtimeElement.innerHTML = `Playtime <br> ${seconds.toFixed(2)} seconds`;
            } else if (minutes < 100) {
                playtimeElement.innerHTML = `Playtime <br> ${minutes.toFixed(2)} minutes`;
            } else if (hours < 100) {
                playtimeElement.innerHTML = `Playtime <br> ${hours.toFixed(2)} hours`;
            } else if (hours < 1000) {
                playtimeElement.innerHTML = `Playtime <br> ${hours.toFixed(1)} hours`;
            } else {
                playtimeElement.innerHTML = `Playtime <br> ${Math.floor(hours)} hours`;
            }
            
            let titleString = '';
            
            titleString += `${Math.floor(hours)}:`;
            titleString += `${Math.floor(minutes % 60)}:`.padStart(3, '0');
            titleString += `${Math.floor(seconds % 60)}:`.padStart(3, '0');
            titleString += `${playtime % 1000}`.padStart(4, '0');
            
            playtimeElement.setAttribute('title', titleString);
            playtimeElement.style.cursor = 'help';
        }
    } else {
        if (htmlUpdates) {
            playtimeElement.innerHTML = 'Never played';
            playtimeElement.removeAttribute('title');
            playtimeElement.style.cursor = 'auto';
        }
        playtime = 0;
    }
    
    if (!game.playData) {
        game.playData = {};
    }
    
    game.playData.timePlayed = playtime;
    
    if (doFirstUpdate || firstPlayedElement.style.display === 'none') {
        if (first) {
            first = parseInt(first);
            if (htmlUpdates) {
                const dateObj = new Date(first);
                firstPlayedElement.style.display = 'block';
                firstPlayedElement.setAttribute('title', new Intl.DateTimeFormat(navigator.language, {
                    dateStyle: 'full',
                    timeStyle: 'long'
                }).format(dateObj));
                firstPlayedElement.style.cursor = 'help';
                firstPlayedElement.innerHTML = `First played ${new Intl.DateTimeFormat(navigator.language).format(dateObj)}`;
            }
        } else {
            first = -1;
            if (htmlUpdates) {
                firstPlayedElement.style.display = 'none';
            }
        }
        
        game.playData.firstPlayed = first;
    }
}

window.onstorage = () => {
    pregenerateData(false);

    if (document.body.classList.contains('disabled')) {
        const gameName = document.querySelector('.overlay-title').innerHTML;
        
        for (let i = 0; i < gameData.length; i++) {
            if (gameData[i].name === gameName && gameData[i].achievements) {
                generateAchievementsOverlay(gameData[i]);
                return;
            }
        }
    }
}

function pregenerateData(initial) {
    for (let i = 0; i < gameData.length; i++) {
        generatePlaytimeData(gameData[i], initial, false);

        if (!gameData[i].achievements) {
            continue;
        }
    
        const keys = Object.keys(gameData[i].achievements);
        for (let j = 0; j < keys.length; j++) {
            getAchievementScoreData(gameData[i], keys[j]);
        }
    }
}

function getAchievementScoreData(game, id) {
    const achievement = game.achievements[id];
    let score = localStorage.getItem(game.name + '.achievements.' + id);
    
    if (score) {
        score = parseInt(score);
    } else {
        score = achievement.fallback;
    }
    
    const colorCount = 5;
    
    switch (achievement.type) {
        case 'generated_tiers':
            let index = 0;
            for (let i = 0; i < achievement.tiers.length; i++) {
                if (score < achievement.tiers[i]) {
                    index = i;
                    break;
                } else if (i === achievement.tiers.length - 1) {
                    index = achievement.tiers.length;
                }
            }
            
            const max = achievement.tiers[Math.min(index, achievement.tiers.length - 1)];
            const current = Math.min(score, achievement.tiers[achievement.tiers.length - 1]);
            
            const progress = current < max ? (current * 100 / max) : 100;
            
            achievement.scoreData = {
                color: index === 0 ? 0 : Math.max(colorCount - achievement.tiers.length, 0) + index,
                data: progress,
                replace: `${max}`
            }
            break;
        default:
            console.error('Unexpected achievement type encountered')
            achievement.scoreData = {
                color: 0,
                data: 0,
                replace: ''
            }
    }
}

let thumbnailsLoaded = false;

function onThumbnailsLoaded() {
    const cards = document.querySelectorAll('.card');

    for (let i = 0; i < cards.length; i++) {
        cards[i].style.display = 'inline-block';
    }

    noResults.style.display = 'none'
    noResults.innerHTML = 'No Results';

    thumbnailsLoaded = true;
}

function onTagClicked(tag) {
    searchBar.focus();
    searchBar.select();
    
    const tagString = `tag:${tag.toLowerCase()}`;
    if (searchBar.value.length >= tagString.length && searchBar.value.includes(tagString)) {
        return;
    }
    if (searchBar.value.replace(' ', '').length === 0) {
        searchBar.value = tagString + ' ';
        searchBar.oninput();
        return;
    }
    searchBar.value = `${tagString} ${searchBar.value}`;
    
    searchBar.oninput();
}

function genCards() {
    let imgLoadingTicker = gameData.length;

    for (let i = 0; i < gameData.length; i++) {
        const card = document.createElement('div');
        card.classList.add('card');
        card.style.display = 'none';
        card.id = gameData[i].name;
        card.setAttribute('card-index', i);
        cardContainer.insertBefore(card, noResults);
        
        const thumbnail = document.createElement('img');
        thumbnail.setAttribute('alt', gameData[i].name);
        thumbnail.setAttribute('draggable', false);
        thumbnail.onload = () => {
            imgLoadingTicker--;
            if (imgLoadingTicker === 0) {
                onThumbnailsLoaded();
            }
        }
        thumbnail.setAttribute('src', gameData[i].thumbnail ?? 'placeholder.png');
        thumbnail.onclick = () => {
            onCardClicked(i)
        }
        card.appendChild(thumbnail);
        
        const text = document.createElement('div');
        text.classList.add('card-text');
        card.appendChild(text);
        
        const header = document.createElement('span');
        header.innerHTML = gameData[i].name;
        header.classList.add('header');
        
        if (!gameData[i].reference) {
            header.classList.add('invalid');
            thumbnail.classList.add('invalid');
        }
        
        header.onclick = () => {
            onCardClicked(i)
        }
        
        text.appendChild(header);
        
        text.appendChild(document.createElement('br'));
        
        const croppedCardText = getCardText(gameData[i].description);
        
        const body = document.createElement('span');
        body.innerHTML = croppedCardText;
        body.classList.add('text');
        
        if (croppedCardText !== gameData[i].description) {
            body.setAttribute('title', gameData[i].description);
            body.style.cursor = 'help';
        }
        
        text.appendChild(body);
        
        text.appendChild(document.createElement('br'));
        
        const tags = document.createElement('div');
        tags.classList.add('tags');
        text.appendChild(tags);
        
        for (let j = 0; j < gameData[i].tags.length; j++) {
            const tag = document.createElement('span');
            tag.classList.add('tag');
            tag.classList.add(tagColorMap[gameData[i].tags[j].toLowerCase()]);
            tag.innerHTML = gameData[i].tags[j];
            tag.onclick = () => onTagClicked(gameData[i].tags[j]);
            tags.appendChild(tag);
        }
    }

    setTimeout(() => {
        if (!thumbnailsLoaded) {
            imgLoadingTicker = 0;

            onThumbnailsLoaded();
        }
    }, 5000);
}

pregenerateData(true);
genCards();

function setupGlow() {
    const docStyle = document.documentElement.style;
    const title = document.querySelector('.title');
    
    docStyle.setProperty('--glow-width', title.offsetWidth + 'px');
    docStyle.setProperty('--glow-height', title.offsetHeight + 'px');
}

setupGlow();

const cards = document.querySelectorAll('.card');

function getTitle(card) {
    for (const cardText of card.children) {
        if (cardText.className === 'card-text') {
            for (const header of cardText.children) {
                if (header.className === 'header' || header.className === 'header invalid') {
                    return header.textContent.toLowerCase().split(' ');
                }
            }
        }
    }
}

function getTags(card) {
    for (const cardText of card.children) {
        if (cardText.className === 'card-text') {
            for (const tags of cardText.children) {
                if (tags.className === 'tags') {
                    const tagList = [];
                    for (let i = 0; i < tags.children.length; i++) {
                        tagList.push(tags.children[i].textContent.toLowerCase());
                    }
                    return tagList;
                }
            }
        }
    }
}

const validTags = [];

for (let i = 0; i < gameData.length; i++) {
    for (let j = 0; j < gameData[i].tags.length; j++) {
        if (!validTags.includes('tag:' + gameData[i].tags[j].toLowerCase())) {
            validTags.push('tag:' + gameData[i].tags[j].toLowerCase());
        }
    }
}

searchBar.oninput = () => {
    const tokens = searchBar.value.toLowerCase().split(' ');

    for (const card of cards) {
        card.style.display = 'inline-block';
    }

    for (const card of cards) {
        const title = getTitle(card);
        for (let i = 0; i < tokens.length; i++) {
            if(tokens[i].startsWith('tag:')) {
                const cardTags = getTags(card);
                let matched = !validTags.includes(tokens[i]);
                for (let j = 0; j < cardTags.length; j++) {
                    if (tokens[i] === `tag:${cardTags[j]}`) {
                        matched = true;
                    }
                }
                if (!matched) {
                    card.style.display = 'none';
                }
            } else {
                let containsWord = false;
                for (let j = 0; j < title.length; j++) {
                    if (title[j] === tokens[i]) {
                        containsWord = true;
                        title.splice(j, 1);
                        j--;
                    }
                }
                for (let j = 0; j < title.length; j++) {
                    if (title[j].includes(tokens[i])) {
                        containsWord = true;
                        title.splice(j, 1);
                        j--;
                    }
                }
                if (!containsWord) {
                    card.style.display = 'none';
                }
            }
        }
    }
    
    let oneShown = false;
    
    for (const card of cards) {
        if (card.style.display !== 'none') {
            oneShown = true;
            break;
        }
    }
    
    if (!oneShown) {
        noResults.style.display = 'inline-block';
    } else {
        noResults.style.display = 'none';
    }
}

window.onresize = () => {
    
}

window.onresize();