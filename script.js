// Instagram Follow Management Tool
// Versión mejorada y organizada para mayor claridad y funcionalidad

function parseFetchString(fetchString) {
	try {
		const cleanStr = fetchString.trim().replace(/;$/, '');
		const urlMatch = cleanStr.match(/fetch\("([^"]+)",\s*\{/);
		if (!urlMatch) throw new Error("No se pudo extraer la URL");
		const url = urlMatch[1];

		const configStart = cleanStr.indexOf('{');
		const configEnd = cleanStr.lastIndexOf('}') + 1;
		if (configStart === -1 || configEnd === 0) throw new Error("No se pudo extraer la configuración");

		const configStr = cleanStr.slice(configStart, configEnd);
		const config = JSON.parse(configStr);

		return { url, config };
	} catch (error) {
		console.error('Error parsing fetch string:', error);
		return null;
	}
}

async function startProcess() {
	console.log('🌟 Instagram Follow Management Tool 🌟');

	const fetchString = prompt(`Por favor pega aquí el fetch copiado del inspector de red:
    (Ejemplo: fetch("https://www.instagram.com/api/v1/...", { "headers": {...}, ... })`);
	if (!fetchString) return;

	const parsed = parseFetchString(fetchString);
	if (!parsed) {
		alert('❌ No se pudo procesar el fetch. Asegúrate de copiarlo completo.');
		return;
	}

	const userIdMatch = parsed.url.match(/friendships\/(\d+)/);
	const userId = userIdMatch ? userIdMatch[1] : 'self';

	const apiConfig = {
		userId,
		baseHeaders: parsed.config.headers,
		referrer: parsed.config.referrer,
		credentials: parsed.config.credentials,
		mode: parsed.config.mode
	};

	const option = prompt(`Selecciona una opción:
1. Ver lista de quienes no te siguen
2. Dejar de seguir a quienes no te siguen (excluyendo verificados)
3. Dejar de seguir a TODOS los que no te siguen (incluyendo verificados)
4. Ver lista de seguidores
5. Ver lista de seguidos

Ingresa el número de tu opción (1-5):`);

	switch (option) {
		case '1':
			await showNonFollowers(apiConfig);
			break;
		case '2':
			await unfollowNonFollowers(apiConfig, true);
			break;
		case '3':
			await unfollowNonFollowers(apiConfig, false);
			break;
		case '4':
			await showFollowers(apiConfig);
			break;
		case '5':
			await showFollowing(apiConfig);
			break;
		default:
			alert('Opción no válida');
	}
}

async function showNonFollowers(config) {
	const nonFollowers = await getNonFollowers(config, true);
	displayUsers(nonFollowers, 'No seguidores');
}

async function showFollowers(config) {
	const followers = await getUsers(config, 'followers', 12, false);
	displayUsers(followers, 'Seguidores');
}

async function showFollowing(config) {
	const following = await getUsers(config, 'following', 200, false);
	displayUsers(following, 'Seguidos');
}

async function displayUsers(users, title) {
	const viewOption = prompt(`¿Cómo deseas ver la lista de ${title}?
1. Como tabla
2. Solo nombres en array
Ingresa 1 o 2:`);

	if (viewOption === '1') {
		console.table(users.map(u => ({ Usuario: `@${u.username}`, Verificado: u.is_verified ? 'Sí' : 'No' })));
	} else if (viewOption === '2') {
		console.log(users.map(u => u.username));
	} else {
		alert('Opción no válida. Mostrando como tabla por defecto.');
		console.table(users.map(u => ({ Usuario: `@${u.username}`, Verificado: u.is_verified ? 'Sí' : 'No' })));
	}

	alert(`Revisa la consola para ver la lista de ${users.length} cuentas.`);
}

async function unfollowNonFollowers(config, excludeVerified) {
	const nonFollowers = await getNonFollowers(config, excludeVerified);
	if (nonFollowers.length === 0) return alert('🎉 No hay cuentas para dejar de seguir!');

	if (confirm(`¿Dejar de seguir a ${nonFollowers.length} cuentas?`)) {
		await executeUnfollows(config, nonFollowers);
		alert(`✅ Proceso completado! Se dejaron de seguir ${nonFollowers.length} cuentas.`);
	}
}

async function getNonFollowers(config, excludeVerified) {
	const [followers, following] = await Promise.all([
		getUsers(config, 'followers', 12, false),
		getUsers(config, 'following', 200, excludeVerified)
	]);

	const followerIds = followers.map(f => f.id);
	return following.filter(u => !followerIds.includes(u.id));
}

async function getUsers(config, type, count, excludeVerified) {
	let results = [], nextId = null;
	const baseUrl = `https://www.instagram.com/api/v1/friendships/${config.userId}/${type}/?count=${count}`;

	do {
		const url = nextId ? `${baseUrl}&max_id=${nextId}` : baseUrl;
		const response = await fetch(url, {
			headers: config.baseHeaders,
			referrer: config.referrer,
			credentials: config.credentials,
			mode: config.mode
		});
		const data = await response.json();

		results.push(...data.users
			.filter(u => excludeVerified ? !u.is_verified : true)
			.map(u => ({ id: u.pk, username: u.username, is_verified: u.is_verified })));

		nextId = data.next_max_id;
		await delay(1000);
	} while (nextId);

	return results;
}

async function executeUnfollows(config, users) {
	for (let i = 0;i < users.length;i++) {
		try {
			await fetch(`https://www.instagram.com/api/v1/friendships/destroy/${users[i].id}/`, {
				method: 'POST',
				headers: { ...config.baseHeaders, 'content-type': 'application/x-www-form-urlencoded' },
				body: `user_id=${users[i].id}`,
				credentials: config.credentials
			});

			console.log(`✅ ${i + 1}/${users.length}: @${users[i].username}`);
			await delay(i % 5 === 0 ? 90000 : 30000);
		} catch (error) {
			console.error(`❌ Error con @${users[i].username}:`, error);
		}
	}
}

const delay = ms => new Promise(r => setTimeout(r, ms));

startProcess();
