import React from 'react';

import {
  Container, Text, ListItem, List, FooterTab, Footer, Icon, Button
} from 'native-base';

import { Col, Row, Grid } from 'react-native-easy-grid';

import { Alert, View, Image } from 'react-native';

import BluetoothSerial from 'react-native-bluetooth-serial-next';
import { ColorPicker, fromHsv } from 'react-native-color-picker';

import { convertHexToRgbString } from './utils';

export default class App extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      pairedDevices: [],
      connectedDevice: null,
      connecting: false,
      isModalVisible: false,
      selectedColor: null,
      text: 'L.A.M.P.'
    }
  }

  async componentWillMount() {
    await this.getPairedDevices()
    await this.isBluetoothEnabled()
  }

  componentDidMount() {
    BluetoothSerial.on('bluetoothDisabled', this.isBluetoothEnabled)
  }

  componentWillUnmount() {
    BluetoothSerial.removeListener('bluetoothDisabled')
  }

  isBluetoothEnabled = async () => {
    try {
      const bluetoothState = await BluetoothSerial.isEnabled()
      if (!bluetoothState) {
        this.setState({
          connectedDevice: null,
        })
        Alert.alert(
          'Moduł bluetooth jest wyłączony',
          'Chcesz włączyć modół bluetooth?',
          [
            {
              text: 'Nie',
              onPress: () => console.log('Cancel Pressed'),
              style: 'cancel',
            },
            {
              text: 'Tak',
              onPress: () => this.enableBluetoothAndRefresh(),
            },
          ],
          { cancelable: false },
        )
      }
    } catch (e) {
      console.log(e)
    }
  }

  getPairedDevices = async () => {
    try {
      const pairedDevices = await BluetoothSerial.list()
      this.setState({
        pairedDevices,
      })
    } catch (e) {
      console.log(e)
    }
  }

  enableBluetoothAndRefresh = async () => {
    try {
      await BluetoothSerial.enable()
      setTimeout(() => {
        this.getPairedDevices()
      }, 1000)
    } catch (e) {
      console.log(e)
    }
  }

  connectToDevice = async device => {
    const { connectedDevice } = this.state
    const connectedDeviceId = connectedDevice && connectedDevice.id
    if (!this.state.connecting) {
      if (device.id === connectedDeviceId) {
        alert('Powiązane urządzenie ' + device.name)
      } else {
        try {
          this.setState({
            connecting: true,
            connectedDevice: null,
          })
          await BluetoothSerial.connect(device.id)
          this.setState({
            connectedDevice: device,
            connecting: false,
            text: 'Połączono z ' + device.name
          })
        } catch (e) {
          console.log(e)
          this.setState({
            connectedDevice: null,
            connecting: false,
          })
          alert('Nie można nawiązać połączenia!')
        }
      }
    }
  }

  disconnect = async () => {
    if (!this.state.connecting) {
      try {
        this.setState({
          connecting: true,
        })
        await BluetoothSerial.disconnect()
        this.setState({
          connectedDevice: null,
          connecting: false,
          text: 'L.A.M.P.'
        })
      } catch (e) {
        console.log(e)
        this.setState({
          connecting: false,
        })
      }
    }
  }

  sendStringToDevice = async data => {
    try {
      await BluetoothSerial.write(data)
      this.setState({
        selectedColor: null,
      })
    } catch (e) {
      console.log(e)
    }
  }

  handleColorChange = color => {
    const hexColor = fromHsv(color)
    this.setState({ selectedColor: hexColor })
    this.setColor(hexColor)
  }

  setColor = async color => {
    try {
      await BluetoothSerial.write(convertHexToRgbString(color))
    } catch (e) {
      console.log(e)
    }
  }

  render(){
    const ListMain = (
      <List style={[{marginTop: 20, marginBottom: 20}]}>
        {
          this.state.pairedDevices.map((item,index) => {
            return(
              <ListItem itemDivider
                style={[{backgroundColor: '#666'}]}
                onPress={() => this.connectToDevice(item)}
              >
                <Text style={[{color: '#fff', fontSize: 17}]}>
                  Name: {item.name} / {item.id}
                </Text>
              </ListItem>
            );
          })
        }
      </List>
    );

    if(this.state.connecting){
      return(
        <Loader />
      );
    }
    return(
      <Container>
        <HeaderMain text={this.state.text} />
        
        {
          !this.state.connectedDevice
          ? (
              <Grid>
                  <Row style={[{backgroundColor: '#333', display: 'flex', justifyContent: 'center'}]}>
                    <Col style={[{display: 'flex', alignItems: 'center'}]}>
                      <Text style={[{color: '#fff', fontSize: 20, marginTop: 30, marginBottom:15}]}>Lista powiązanych urządzeń:</Text>
                    
                      <View>{ListMain}</View>

                      <ButtonRefresh
                        getPairedDevices={this.getPairedDevices}
                      />
                    </Col>
                  </Row>
                  
              </Grid>
          )
          : (
              <Grid>
                  <Row style={[{backgroundColor: '#333', display: 'flex', justifyContent: 'center'}]}>
                    <Col style={[{display: 'flex', alignItems: 'center', justifyContent:'center'}]}>

                      <ColorPicker
                        style={[{width: 290, height: 290}]}
                        onColorChange={this.handleColorChange}
                        color={this.state.selectedColor}
                      />

                      <ButtonsMain 
                        sendStringToDevice={this.sendStringToDevice}
                        disconnect={this.disconnect}
                      />
                    </Col>
                  </Row>
              </Grid>
          )
        }
      </Container>
    );
  }
}

const HeaderMain = props => (
  <View style={[{height: 50, backgroundColor: '#555', display: 'flex', justifyContent: 'center', alignItems: 'center'}]}>
    <Text style={[{color: '#fff', fontSize: 20}]}>{props.text}</Text>
  </View>
);

const Loader = () => (
  <View style={[{width: '100%', height: '100%', backgroundColor: '#333', display:'flex', justifyContent: 'center', alignItems: 'center'}]}>
    <Image 
      source={require('./images/bt.png')}
      style={[{width: 200, height: 300}]}
    />
  </View>
);

const ButtonsMain = props => {

  return (
      <Footer style={[{position: 'absolute', bottom: 0}]}>
          <FooterTab>
            <Button onPress={() => props.sendStringToDevice('999,')} style={[{backgroundColor:'#555'}]}>
              <Text>Włącz</Text>
            </Button>
            <Button onPress={() => props.sendStringToDevice('998,')} style={[{backgroundColor:'#555'}]}>
              <Text>Wyłącz</Text>
            </Button>
            <Button onPress={props.disconnect} style={[{backgroundColor:'#555'}]}>
              <Text>Rozłącz</Text>
            </Button>
          </FooterTab>
      </Footer>
  )
}

const ButtonRefresh = props => (
  <Footer style={[{position: 'absolute', bottom: 0}]}>
          <FooterTab>
            <Button onPress={props.getPairedDevices} style={[{backgroundColor:'#555'}]}>
              <Icon name="refresh"/>
            </Button>
          </FooterTab>
      </Footer>
); 