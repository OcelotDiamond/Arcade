const cardContainer = document.querySelector('.card-container');
const noResults = document.querySelector('.no-results');

const tagColorMap = {
    platformer: 'blue',
    infinite: 'purple',
    puzzle: 'orange',
    '2d': 'yellow'
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
        thumbnail: 'BASALT/thumbnail.png',
        reference: 'BASALT/basalt.html'
    }, {
        name: 'Prism',
        description: 'Under Construction',
        tags: [
            'Puzzle',
            '2D'
        ]
    }
];

function getCardText(text) {
    if (testText(text) <= 3) {
        return text;
    }
    
    const segments = text.split(' ');
    let totalString = '';
    
    for (let i = 0; i < segments.length; i++) {
        if (testText(`${totalString} ${segments[i]} ...`) > 3) {
            return totalString + ' ...';
        }
        
        totalString += ' ' + segments[i];
    }
    
    return text;
}

function testText(text) {
    const testingDiv = document.querySelector('.height-tester');
    testingDiv.style.width = '168px';
    testingDiv.style.lineHeight = '16px';
    testingDiv.innerHTML = text;
    
    return Math.round(testingDiv.offsetHeight / parseInt(testingDiv.style.lineHeight));
}

function onCardClicked(index) {
    if (!gameData[index].reference) {return}
    document.location.href = gameData[index].reference;
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

function genCards() {
    let imgLoadingTicker = gameData.length;

    for (let i = 0; i < gameData.length; i++) {
        const card = document.createElement('div');
        card.classList.add('card');
        card.style.display = 'none';
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

genCards();

function setupGlow() {
    const docStyle = document.documentElement.style;
    const title = document.querySelector('.title');
    
    docStyle.setProperty('--glow-width', title.offsetWidth + 'px');
    docStyle.setProperty('--glow-height', title.offsetHeight + 'px');
}

setupGlow();

const searchBar = document.querySelector('input');
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

for (let i = 0; i < cards.length; i++) {
    for (const cardText of cards[i].children) {
        if (cardText.className === 'card-text') {
            for (const tags of cardText.children) {
                if (tags.className === 'tags') {
                    for (const tag of tags.children) {
                        tag.onclick = () => {
                            const tagString = `tag:${tag.innerHTML.toLowerCase()}`;
                            if (searchBar.value.length >= tagString.length
                                && searchBar.value.includes(tagString)) {
                                return;
                            }
                            if (searchBar.value.replace(' ', '').length === 0) {
                                searchBar.value = tagString;
                                searchBar.oninput();
                                return;
                            }
                            searchBar.value = `${tagString} ${searchBar.value}`;
                            
                            searchBar.oninput();
                        }
                    }
                }
            }
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
        console.log('here')
    } else {
        noResults.style.display = 'none';
    }
}