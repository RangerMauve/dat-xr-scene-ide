
AFRAME.registerComponent('editor-system', {
  init: function () {
    this.onKeyup = this.onKeyup.bind(this)
  },

  play: function () {
    window.addEventListener('keyup', this.onKeyup, false)
  },

  pause: function () {
    window.removeEventListener('keyup', this.onKeyup)
  },

  onKeyup: function (evt) {
    const hasTerminal = document.body.querySelector('#editor-terminal')

    if (hasTerminal) return
    if (!(
      (evt.key === 't') &&
      evt.getModifierState('Control') &&
      evt.getModifierState('Alt')
    )) return

    // <a-curvedimage
    //   class="terminal"
    //   editor-terminal
    //   material="depthTest: false"
    //   theta-start="150"
    //   theta-length="60"
    //   radius="3"
    //   height="2"
    //   opacity="0.8"
    //   position="0 2 -1"
    // ></a-curvedimage>

    const terminal = document.createElement('a-curvedimage')
    terminal.id = 'editor-terminal'
    terminal.setAttribute('aframe-injected', '')
    terminal.setAttribute('class', 'terminal')
    terminal.setAttribute('editor-terminal', '')
    terminal.setAttribute('material', 'depthTest: false')
    terminal.setAttribute('theta-start', '150')
    terminal.setAttribute('theta-length', '60')
    terminal.setAttribute('radius', '4')
    terminal.setAttribute('height', '2')
    terminal.setAttribute('opacity', '0.8')
    terminal.setAttribute('position', '0 2 0')

    this.el.appendChild(terminal)

    evt.preventDefault()
  }
})

AFRAME.registerComponent('editor-terminal', {
  dependencies: ['xterm'],
  init: function () {
    const term = this.el.components['xterm'].term

    const shell = new XtermJSShell.default(term)

    shell
      .command('help', async (shell) => {
        await shell.printLine('Try running one of these commands:')
        const commands = shell.commands.sort()
        await shell.printList(commands)
      })
      .command('curl', async (shell, [ url ]) => {
        const response = await fetch(url)

        const text = await response.text()

        await shell.print(text)
      })
      .command('ssh', async (shell, { url }) => {
        // For use with https://github.com/RangerMauve/websocket-shell-service

        if (!url) url = 'ws://localhost:8080'

        const socket = new WebSocket(url)

        let closed = false

        socket.onclose = () => {
          closed = true
          shell.printLine(`Connection to ${url} closed`)
        }

        socket.onmessage = ({ data }) => {
          shell.print(data)
        }

        for await (let data of shell.readStream()) {
          if (closed) break
          socket.send(data)
        }
      })
      .command('env', async (shell) => {
        const env = shell.env
        const values = Object.keys(env).map((key) => {
          let value = env[key]
          if (value instanceof HTMLElement) {
            value = getPathToElement(value)
          }
          return `${key}=${value}`
        })
        await shell.printList(values)
      })
      .command('pwd', async (shell) => {
        const { pwd } = shell.env

        const path = getPathToElement(pwd)

        await shell.printLine(path)
      })
      .command('ls', async (shell) => {
        const { pwd } = shell.env

        const paths = getElementPaths(pwd)

        await shell.printList(paths)
      })
      .command('cat', async (shell, [name]) => {
        const { pwd } = shell.env

        const attribute = pwd.getAttribute(name)

        if (!attribute) throw new Error(`Not found: ${name}`)
        if (typeof attribute === 'string') {
          shell.printLine(attribute)
        } else {
          for (let key of Object.keys(attribute)) {
            const value = attribute[key]
            const stringified = JSON.stringify(value)
            shell.printLine(`${key}=${stringified}`)
          }
        }
      }, autoCompletePath)
      .command('cd', async (shell, [path]) => {
        const { pwd } = shell.env

        if (path === '~') {
          shell.env.pwd = document.querySelector('a-scene')
          return
        }

        const element = getElementAtPath(pwd, path)

        if (!element) throw new Error('Element not found')

        shell.env.pwd = element
      }, autoCompletePath)
      .command('write', async (shell, [path, key, value], flags) => {
        const { pwd } = shell.env

        if (!value) {
          pwd.setAttribute(path, key)
        } else {
          pwd.setAttribute(path, key, value)
        }

        if (!pwd.components) return

        let component = pwd.components[path]

        if (component) component.flushToDOM()
      }, autoCompletePath)
      .command('mkdir', async (shell, [tagName, selector]) => {
        const { pwd } = shell.env

        const element = document.createElement(tagName)

        if (selector) {
          if (selector.startsWith('#')) {
            element.id = selector.slice(1)
          } else if (selector.startsWith('.')) {
            element.classList.add(selector.slice(1))
          }
        } else {
          let nextId = shell.env.NEXT_NODE_ID
          while (document.querySelector(`#e${nextId}`)) {
            nextId = ++shell.env.NEXT_NODE_ID
          }

          element.id = `e${nextId}`
        }

        pwd.appendChild(element)
      })
      .command('exit', async () => {
        this.el.parentNode.removeChild(this.el)
      })
      .command('eval', async (shell, [command]) => {
        await shell.printLine(eval(command))
      })

    shell.env.pwd = document.querySelector('a-scene')
    shell.env.NEXT_NODE_ID = Math.round(Math.random() * 9000)

    shell.print(`
Welcome to the XR IDE terminal.\rW

Try the following:\r
mkdir a-sphere #example-sphere\r
cd #example-sphere\r
write color purple\r
write radius 0.2\r
write position "-1 1 -1"\r
write click "this.setAttribute('color', 'purple')"\r
`)

    shell.repl()

    function autoCompletePath (index, tokens) {
      if (index === 0) {
        const { pwd } = shell.env
        return getElementPaths(pwd)
      } else {
        return []
      }
    }
  }
})

function getPathToElement (element) {
  if (element.tagName === 'HTML') return '/'

  const name = getElementFolderName(element)

  return getPathToElement(element.parentNode) + name
}

function getElementFolderName (element) {
  const tagName = element.tagName.toLowerCase()
  const id = element.id ? `#${element.id}` : ''

  const classList = element.classList
  const classSuffix = [...classList].map((className) => `.${className}`).join('')
  return `${tagName}${id}${classSuffix}/`
}

function getElementAtPath (parent, path) {
  let sections = path.split('/')

  while (sections[0] === '..') {
    sections = sections.slice(1)
    parent = parent.parentNode
  }

  const selector = sections.filter((section) => !!section).join(' > ')

  if (!selector) return parent
  return parent.querySelector(selector)
}

function getElementPaths (element) {
  const elements = element.childNodes

  return [...elements]
    .filter(shouldShowElement)
    .map(getElementFolderName)
    .concat([...element.attributes].map(({ name }) => name))
}

function shouldShowElement (element) {
  const type = element.nodeType
  if (type !== Node.ELEMENT_NODE) return false
  if (element.hasAttribute('aframe-injected')) return false
  if (element.classList.contains('a-loader-title')) return false
  if (element.classList.contains('a-canvas')) return false
  return true
}
