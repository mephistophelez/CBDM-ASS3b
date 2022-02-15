// Import libraries
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.126.0/build/three.module.js'
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.126.0/examples/jsm/controls/OrbitControls.js'
import rhino3dm from 'https://cdn.jsdelivr.net/npm/rhino3dm@0.15.0-beta/rhino3dm.module.js'
import { RhinoCompute } from 'https://cdn.jsdelivr.net/npm/compute-rhino3d@0.13.0-beta/compute.rhino3d.module.js'
import { Rhino3dmLoader } from 'https://cdn.jsdelivr.net/npm/three@0.124.0/examples/jsm/loaders/3DMLoader.js'

const definitionName = 'rnd_node.gh'

// Set up sliders
const radius_slider = document.getElementById('radius')
radius_slider.addEventListener('mouseup', onSliderChange, false)
radius_slider.addEventListener('touchend', onSliderChange, false)

const count_slider = document.getElementById('count')
count_slider.addEventListener('mouseup', onSliderChange, false)
count_slider.addEventListener('touchend', onSliderChange, false)

const style_slider = document.getElementById("style")
style_slider.addEventListener('mouseover', onSliderChange,false)
style_slider.addEventListener('mouseover', onSliderChange,false)

const depth_slider = document.getElementById("depth")
depth_slider.addEventListener('mouseover', onSliderChange,false)
depth_slider.addEventListener('mouseover', onSliderChange,false)

const divisions_slider = document.getElementById("divisions")
divisions_slider.addEventListener('mouseover', onSliderChange,false)
divisions_slider.addEventListener('mouseover', onSliderChange,false)

const strengths_slider = document.getElementById("strengths")
strengths_slider.addEventListener('mouseover', onSliderChange,false)
strengths_slider.addEventListener('mouseover', onSliderChange,false)


const loader = new Rhino3dmLoader()
loader.setLibraryPath('https://cdn.jsdelivr.net/npm/rhino3dm@0.15.0-beta/')

// set up button click handlers
const downloadButton = document.getElementById("downloadButton")
downloadButton.onclick = download

let rhino, definition, doc
rhino3dm().then(async m => {
    console.log('Loaded rhino3dm.')
    rhino = m // global

    //RhinoCompute.url = getAuth( 'RHINO_COMPUTE_URL' ) // RhinoCompute server url. Use http://localhost:8081 if debugging locally.
    //RhinoCompute.apiKey = getAuth( 'RHINO_COMPUTE_KEY' )  // RhinoCompute server api key. Leave blank if debugging locally.
    RhinoCompute.url = 'http://localhost:8081/' //if debugging locally.
    // load a grasshopper file!
    const url = definitionName
    const res = await fetch(url)
    const buffer = await res.arrayBuffer()
    const arr = new Uint8Array(buffer)
    definition = arr

    init()
    compute()
})

async function compute() {


    const param1 = new RhinoCompute.Grasshopper.DataTree('Radius')
    param1.append([0], [radius_slider.valueAsNumber])

    const param2 = new RhinoCompute.Grasshopper.DataTree('Count')
    param2.append([0], [count_slider.valueAsNumber])

    const param3 = new RhinoCompute.Grasshopper.DataTree('style')
    param3.append([0], [style_slider.valueAsNumber])

    const param4 = new RhinoCompute.Grasshopper.DataTree('depth')
    param4.append([0], [depth_slider.valueAsNumber])

    const param5 = new RhinoCompute.Grasshopper.DataTree('divisions')
    param5.append([0], [divisions_slider.valueAsNumber])

    const param6 = new RhinoCompute.Grasshopper.DataTree('strengths')
    param6.append([0], [strengths_slider.valueAsNumber])

    // clear values
    const trees = []
    trees.push(param1)
    trees.push(param2)
    trees.push(param3)
    trees.push(param4)
    trees.push(param5)
    trees.push(param6)


    const res = await RhinoCompute.Grasshopper.evaluateDefinition(definition, trees)

    doc = new rhino.File3dm()

    // hide spinner
    document.getElementById('loader').style.display = 'none'

    //decode grasshopper objects and put them into a rhino document

    for (let i = 0; i < res.values.length; i++) {

        for (const [key, value] of Object.entries(res.values[i].InnerTree)) {
            for (const d of value) {

                const data = JSON.parse(d.data)
                const rhinoObject = rhino.CommonObject.decode(data)
                doc.objects().add(rhinoObject, null)

            }
        }
    }
  // go through the objects in the Rhino document

  let objects = doc.objects();
  for ( let i = 0; i < objects.count; i++ ) {
  
    const rhinoObject = objects.get( i );


     // asign geometry userstrings to object attributes
    if ( rhinoObject.geometry().userStringCount > 0 ) {
      const g_userStrings = rhinoObject.geometry().getUserStrings()
      rhinoObject.attributes().setUserString(g_userStrings[0][0], g_userStrings[0][1])
      
      const cost = rhinoObject.geometry().getUserStrings()[1]
      console.log(cost)
      rhinoObject.attributes().setUserString(g_userStrings[0][0], g_userStrings[0][1])
         
    }
  }

    // clear objects from scene
    scene.traverse(child => {
        if (!child.isLight) {
            scene.remove(child)
        }
    })

    const buffer = new Uint8Array(doc.toByteArray()).buffer
    loader.parse(buffer, function (object) {

        object.traverse((child) => {
            if (child.isLine) {
      
              if (child.userData.attributes.geometry.userStringCount > 0) {
                
                //get color from userStrings
                const colorData = child.userData.attributes.userStrings[0]
                const col = colorData[1];
      
                //convert color from userstring to THREE color and assign it
                const threeColor = new THREE.Color("rgb(" + col + ")");
                const mat = new THREE.LineBasicMaterial({ color: threeColor });
                child.material = mat;
              }
            }
          });

        scene.add(object)
        // hide spinner
        document.getElementById('loader').style.display = 'none'

        // enable download button
        downloadButton.disabled = false
    } )

    // enable download button
    downloadButton.disabled = false
}


function onSliderChange() {
    // show spinner
    document.getElementById('loader').style.display = 'block'
    compute()
}

function onClick( event ) {

    console.log( `click! (${event.clientX}, ${event.clientY})`)

	// calculate mouse position in normalized device coordinates
    // (-1 to +1) for both components

	mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1
    mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1
    
    raycaster.setFromCamera( mouse, camera )

	// calculate objects intersecting the picking ray
    const intersects = raycaster.intersectObjects( scene.children, true )

    let container = document.getElementById( 'container' )
    if (container) container.remove()

    // reset object colours
    scene.traverse((child, i) => {
        if (child.userData.hasOwnProperty( 'material' )) {
            child.material = child.userData.material
        }
    })

    if (intersects.length > 0) {

        // get closest object
        const object = intersects[0].object
        console.log(object) // debug

        object.traverse( (child) => {
            if (child.parent.userData.objectType === 'Brep') {
                child.parent.traverse( (c) => {
                    if (c.userData.hasOwnProperty( 'material' )) {
                        c.material = selectedMaterial
                    }
                })
            } else {
                if (child.userData.hasOwnProperty( 'material' )) {
                    child.material = selectedMaterial
                }
            }
        })

        // get user strings
        let cost, count
        if (object.userData.attributes !== undefined) {
            cost = object.userData.attributes.userStrings
        } else {
            // breps store user strings differently...
            cost = object.parent.userData.attributes.userStrings
        }

        // do nothing if no user strings
        if ( cost === undefined ) return

        console.log( cost )
        
        // create container div with table inside
        container = document.createElement( 'div' )
        container.id = 'container'
        
        const table = document.createElement( 'table' )
        container.appendChild( table )

        for ( let i = 0; i < cost.length; i ++ ) {

            const row = document.createElement( 'tr' )
            row.innerHTML = `<td>${cost[ i ][ 0 ]}</td><td>${cost[ i ][ 1 ]}</td>`
            table.appendChild( row )
        }

        document.body.appendChild( container )
    }

}


// BOILERPLATE //

let scene, camera, renderer, controls

function init() {

    // create a scene and a camera
    scene = new THREE.Scene()
    scene.background = new THREE.Color(1, 1, 1)
    camera = new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 0.1, 1000)
    camera.position.y = - 30

    // create the renderer and add it to the html
    renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(window.innerWidth, window.innerHeight)
    document.body.appendChild(renderer.domElement)

    // add some controls to orbit the camera
    controls = new OrbitControls(camera, renderer.domElement)

    // add a directional light
    const directionalLight = new THREE.DirectionalLight(0xffffff)
    directionalLight.intensity = 2
    directionalLight.position.y = - 30
    scene.add(directionalLight)

    const ambientLight = new THREE.AmbientLight()
    scene.add(ambientLight)

    animate()
}

// download button handler
function download () {
    let buffer = doc.toByteArray()
    let blob = new Blob([ buffer ], { type: "application/octect-stream" })
    let link = document.createElement('a')
    link.href = window.URL.createObjectURL(blob)
    link.download = 'shelfify.3dm'
    link.click()
}

function animate() {
    requestAnimationFrame(animate)
    renderer.render(scene, camera)
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()
    renderer.setSize(window.innerWidth, window.innerHeight)
    animate()
}

function meshToThreejs(mesh, material) {
    const loader = new THREE.BufferGeometryLoader()
    const geometry = loader.parse(mesh.toThreejsJSON())
    return new THREE.Mesh(geometry, material)
}