const { TeamSpeakClient } = require("node-ts");
const { getArgument, escapeRegExp, sendPrivateMessage } = require("./utils.js");
const { handleChannelMessage, handlePrivateMessage } = require("./message_handler.js");

const NICKNAME = 'MusicBot';

async function welcomeMessage(client, data) {
    let clientInfo = await client.send('clientinfo', {
        clid: data.clid
    });
    console.log(clientInfo);
    clientInfo = clientInfo.response[0];

    if(data.client_type !== 1) {
        let firstConnected = new Date(clientInfo.client_created * 1000);
        let lastConnected = new Date(clientInfo.client_lastconnected * 1000);
        // let connectedTime = new Date(clientInfo.connection_connected_time); ///TODO: save and update connectedTime

        sendPrivateMessage(client, data.clid,
            `\n[b][color=#5D77FF]Hello ${clientInfo.client_nickname}![/color][/b]`
                    + `\nYour first connection: ${firstConnected.getFullYear()}-${firstConnected.getMonth() < 10 ? '0' + firstConnected.getMonth() : firstConnected.getMonth()}-${firstConnected.getDay() < 10 ? '0' + firstConnected.getDay() : firstConnected.getDay()} at ${firstConnected.getHours() < 10 ? '0' + firstConnected.getHours() : firstConnected.getHours()} ${firstConnected.getMinutes() < 10 ? '0' + firstConnected.getMinutes() : firstConnected.getMinutes()}`
                    + `\nYour last connection: ${lastConnected.getFullYear()}-${lastConnected.getMonth()  < 10 ? '0' + lastConnected.getMonth() : lastConnected.getMonth()}-${lastConnected.getDay()  < 10 ? '0' + lastConnected.getDay() : lastConnected.getDay()} at ${lastConnected.getHours() < 10 ? '0' + lastConnected.getHours() : lastConnected.getHours()} ${lastConnected.getMinutes() < 10 ? '0' + lastConnected.getMinutes() : lastConnected.getMinutes()}`
                    + `\nIt's your ${clientInfo.client_totalconnections} visit here!`
                    + `\nHave Fun! :D`);
        console.log(`clid: ${data.clid}`
            + `\nWelcome ${clientInfo.client_nickname}!`
            + `\nYour first connection: ${firstConnected.getFullYear()}-${firstConnected.getMonth() < 10 ? '0' + firstConnected.getMonth() : firstConnected.getMonth()}-${firstConnected.getDay() < 10 ? '0' + firstConnected.getDay() : firstConnected.getDay()} at ${firstConnected.getHours() < 10 ? '0' + firstConnected.getHours() : firstConnected.getHours()} ${firstConnected.getMinutes() < 10 ? '0' + firstConnected.getMinutes() : firstConnected.getMinutes()}`
            + `\nYour last connection: ${lastConnected.getFullYear()}-${lastConnected.getMonth()  < 10 ? '0' + lastConnected.getMonth() : lastConnected.getMonth()}-${lastConnected.getDay()  < 10 ? '0' + lastConnected.getDay() : lastConnected.getDay()} at ${lastConnected.getHours() < 10 ? '0' + lastConnected.getHours() : lastConnected.getHours()} ${lastConnected.getMinutes() < 10 ? '0' + lastConnected.getMinutes() : lastConnected.getMinutes()}`
            + `\nIt's your ${clientInfo.client_totalconnections} visit here!`
            + `\nHave Fun! :D`);
    }
}

/**
 * @param {TeamSpeakClient} client
 * @param {number} channel_id
 * */
async function moveAdminTo(client, channel_id) {
    const clientList = await client.send("clientlist");
    const channelList = await client.send('channellist');
	let serverAdmin = clientList.response.find((obj) => {
		return obj.client_type === 1 && obj.client_nickname.match(
			new RegExp(`^${escapeRegExp(NICKNAME)}`, 'i'));
	});

	if (serverAdmin) {
		if (serverAdmin.cid !== channel_id) {//if serverAdmin is not already in target channel
			await client.send('clientmove', {clid: serverAdmin.clid, cid: channel_id});
			let channel_name = channelList.response.find((obj) => obj.cid === channel_id).channel_name;
			console.log('Admin moved to:', channel_name, 'cid:', channel_id);
		}
	}
	else
		console.error('Music bot or serverAdmin has not been found');
}

async function main(host, login, password) {
    //console.log('host:', host);
    //console.log('login:', login);
    //console.log('password:', password);

    const client = new TeamSpeakClient(host);

    try {
    	client.on('error', e => console.error(e));

        await client.connect();
        await client.send("use", {sid: 1});

        await client.send("login", {
            client_login_name: login,
            client_login_password: password
        });
        await client.send("clientupdate", {client_nickname: NICKNAME});

        // await client.subscribePrivateTextEvents();

        // register notifications when user sends private message
        await client.send("servernotifyregister", {
            event: "textprivate"
        });

        // register notifications when user sends message on normal channel
        await client.send("servernotifyregister", {
            event: "textchannel"
        });

        // register server events notifications
        await client.send("servernotifyregister", {
            event: "server"
        });

        await client.send("servernotifyregister", {
            event: "channel",
            id: 0 // listen to all channels
        });

        const clientlist = await client.send("clientlist");

        // listening for server to be edited
        await client.on('serveredited', data => {
            console.log('Server edited!');
            if(data[0]) {
               console.log(data[0]);
            }
        });

        // listening for client to connect to the server
        await client.on('cliententerview', data => {
            welcomeMessage(client, data[0])
        });

        // listening for client to disconnect from the server
        // await client.on('clientleftview', data => {
        //     console.log(`Client disconnected.`);
        // });

        let musicBotInfo = clientlist.response.find((obj) => obj.client_nickname === "DJ Jaracz");

        if(musicBotInfo)
            await moveAdminTo(client, musicBotInfo.cid);
        else
        	console.error('DJ Jaracz not found');

        // listening for client move to other channel
	    client.on('clientmoved', data => {
	    	if(musicBotInfo && data[0] && data[0].clid === musicBotInfo.clid) {
                moveAdminTo(client, data[0].ctid).catch(console.error);
            }
	    });

        // listening for messages
        client.on("textmessage", data => {
            if( !data[0] || data[0].invokeruid === 'serveradmin' )//ignore messages from serveradmin
            	return;
            if( data[0].targetmode === 2 )
                handleChannelMessage(client, data[0]);
            else if( data[0].targetmode === 1 )
            	handlePrivateMessage(client, data[0]);
        });

        // keeping connection alive every 4 min
        setInterval( () => {
            client.send("version");
            // client.send("clientlist").then(clientlist => {
            //     clientlist.response.forEach(client => {
            //         console.log(client.client_nickname);
            //     });
            // });
        }, 240000);

    } catch(err) {
        console.error("An error occurred: ");
        console.error(err);
    }
}

main(
    getArgument('host'),
    getArgument('login'),
    getArgument('password')
).catch(console.error);
