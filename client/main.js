function getFormData(form) {
    let formData = new FormData(form)
    let formString = ''
    // iterate through entries...
    for (let pair of formData.entries()) {
      formString += pair[0] + '=' + pair[1] + '&'
    }
    return formString
}

const term = new Terminal({ cursorBlink: true })
//const fitAddon = new FitAddon.FitAddon()
//term._addonManager.loadAddon(fitAddon)
term.open(document.getElementById('terminal'))
const bufferLength = term.buffer.active.length;

//fitAddon.fit()

let ws = new WebSocket('ws://localhost')
let ssh_form = document.getElementById('ssh-login')
ssh_form.addEventListener("submit", (e) => {
    e.preventDefault()
    let formData = getFormData(ssh_form)
    console.log('ws://localhost:80/?' + formData)
    term.resize(ssh_form.elements.cols.valueAsNumber, bufferLength + ssh_form.elements.rows.valueAsNumber);
    
    ws = new WebSocket(
        'ws://localhost:80/?' + formData
    )

    ws.onmessage = (msg) => {
        let prefix = msg.data.split("|")[0]
        if(prefix == 'msg') {
            document.getElementById('ssh-info').innerHTML = msg.data.split("|")[1]
        }
        else if(prefix == 'term') {
            term.write(msg.data.split("|")[1])
        }
    }
    // ws.onclose = (e) => {
    //     document.getElementById('ssh-info').innerHTML = 'Oops! Something went wrong!'
    // }
})

let command = ''

function init_term() {
    if (term._initialized) {
        return
    }

    term._initialized = true

    // Browser to server
    term.onData(e => {
        ws.send('cmd|' + e)
    })
}

init_term()

//const exampleSocket = new WebSocket(
//    "ws://localhost:80"
//)